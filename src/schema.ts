import {
  bigint,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// READ ONLY! This schema exists for typing. The table should not ever be
// written to, no migrations should be generated, and no pushes should be
// made from this repository. Schema changes shall be made here instead:
// https://github.com/discohook/discohook/blob/main/packages/store/src/schema/schema.ts
// -- and then mirrored to this file.

// 2025-06-21: OK, we're kind of breaking our previous rule here. We have
// defined the guilds schema so that we can have a migration file that will
// write !!one time!! with data from the old DB -> new DB, and only when the
// `migrate` script is ran by hand.

export const discordGuilds = pgTable("DiscordGuild", {
  id: bigint("id", { mode: "bigint" }).primaryKey(),
  name: text("name").default("Unknown Server").notNull(),
  icon: text("icon"),
  ownerDiscordId: bigint("ownerDiscordId", { mode: "bigint" }),
  botJoinedAt: timestamp("botJoinedAt", { mode: "date" }).$type<Date>(),
});

export const reactionRoles = pgTable(
  "reaction_roles",
  {
    messageId: bigint("message_id", { mode: "bigint" }).notNull(),
    channelId: bigint("channel_id", { mode: "bigint" }).notNull(),
    guildId: bigint("guild_id", { mode: "bigint" })
      .references(() => discordGuilds.id, { onDelete: "cascade" })
      .notNull(),
    roleId: bigint("role_id", { mode: "bigint" }).notNull(),
    reaction: text("reaction").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.reaction] }),
  }),
);
