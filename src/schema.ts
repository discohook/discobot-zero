import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

// READ ONLY! This schema exists for typing. The table should not ever be
// written to, no migrations should be generated, and no pushes should be
// made from this repository. Schema changes shall be made here instead:
// https://github.com/discohook/discohook/blob/main/packages/store/src/schema/schema.ts
// -- and then mirrored to this file.

export const reactionRoles = pgTable(
  "reaction_roles",
  {
    messageId: bigint("message_id", { mode: "bigint" }).notNull(),
    channelId: bigint("channel_id", { mode: "bigint" }).notNull(),
    guildId: bigint("guild_id", { mode: "bigint" }).notNull(),
    roleId: bigint("role_id", { mode: "bigint" }).notNull(),
    reaction: text("reaction").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.reaction] }),
  }),
);
