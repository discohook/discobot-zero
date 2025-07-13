import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import JSONbig_ from "json-bigint";
import * as schema from "../src/schema.js";
import { config } from "dotenv";
import {
  RESTJSONErrorCodes,
  Routes,
  type APIApplication,
  type APIGuildMember,
  type APIWebhook,
} from "discord-api-types/v10";
import { inArray } from "drizzle-orm";
import { REST } from "@discordjs/rest";

config({ path: "./.env" });

const JSONbig = JSONbig_({ useNativeBigInt: true, alwaysParseAsBig: true });

const pgtypes = {
  bigint: postgres.BigInt,
  json: {
    // "json" in pg_catalog.pg_type
    from: [114],
    to: 114,
    parse: JSONbig.parse,
    serialize: JSONbig.stringify,
  },
};

const main = async () => {
  const db = drizzle(postgres(process.env.DATABASE_URL, { types: pgtypes }), {
    schema: schema,
  });

  const guilds = await db.query.discordGuilds.findMany({
    columns: { id: true },
    where: (table, { and, eq, isNull }) =>
      and(
        // likely imported from discobot dump
        eq(table.name, "Unknown Server"),
        isNull(table.botJoinedAt),
        isNull(table.icon),
        isNull(table.ownerDiscordId),
      ),
  });

  console.log(guilds.length);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const me = (await rest.get("/applications/@me")) as APIApplication;
  console.log(`Client: ${me.id} (${me.bot?.username})`);
  console.log("Migrate to:", process.env.MIGRATE_ID);

  const removeIds = new Set<bigint>();
  try {
    for (const { id } of guilds) {
      const prefix = `${id}:`;
      console.log(`${prefix} processing`);

      let hasBotWebhooks = true;
      let hasUtils = true;
      let isMember = true;

      let webhooks: APIWebhook[] = [];
      try {
        webhooks = (await rest.get(
          Routes.guildWebhooks(String(id)),
        )) as APIWebhook[];

        const botWebhooks = webhooks.filter((w) => w.application_id === me.id);
        hasBotWebhooks = botWebhooks.length !== 0;
        console.log(`${prefix} ${botWebhooks.length} bot-owned webhooks`);
      } catch (e) {
        if (
          e.code &&
          [
            RESTJSONErrorCodes.UnknownGuild,
            RESTJSONErrorCodes.MissingAccess,
          ].includes(e.code)
        ) {
          webhooks = [];
          hasBotWebhooks = false;
          isMember = false;
        } else {
          throw e;
        }
      }

      if (isMember) {
        try {
          (await rest.get(
            Routes.guildMember(String(id), process.env.MIGRATE_ID),
          )) as APIGuildMember;
          hasUtils = true;
          console.log(`${prefix} has migrate bot`);
        } catch (e) {
          if (
            e.code &&
            [
              RESTJSONErrorCodes.UnknownMember,
              RESTJSONErrorCodes.MissingAccess,
            ].includes(e.code)
          ) {
            hasUtils = false;
            console.log(`${prefix} missing migrate bot`);
          } else {
            throw e;
          }
        }
      }
      if ((!hasUtils && !hasBotWebhooks) || !isMember) {
        if (isMember) {
          console.log(`${prefix} leaving`);
          try {
            await rest.delete(Routes.userGuild(String(id)));
          } catch (e) {
            console.error(e);
          }
        } else {
          console.log(`${prefix} not a member, skipping leave`);
        }
        console.log(`${prefix} adding to delete queue`);
        removeIds.add(id);
      }
      // d.js should handle rate limits for us, this just makes it a bit safer
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (e) {
    console.error(e);
    console.log(
      `Error while checking guilds, removing ${removeIds.size} already found to be prunable`,
    );
  }
  if (removeIds.size !== 0) {
    await db
      .delete(schema.discordGuilds)
      .where(inArray(schema.discordGuilds.id, [...removeIds]));
  }

  console.log("Finished!");
  process.exit(0);
};

await main();
