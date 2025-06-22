import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import JSONbig_ from "json-bigint";
import * as schema from "../src/schema.js";
import { sql } from "drizzle-orm";
import path from "node:path";
import { stat } from "node:fs/promises";
import { config } from "dotenv";

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

  console.log("Checking for dump");
  const dumpfile = path.resolve(process.cwd(), "scripts", "reaction_roles.sql");
  try {
    await stat(dumpfile);
  } catch {
    console.error("reaction_roles.sql doesn't exist in the CWD");
    return;
  }

  await db.transaction(async (tx) => {
    try {
      console.log("Copy: creating temp table");
      await tx.execute(
        sql`CREATE TEMPORARY TABLE IF NOT EXISTS old_reaction_roles (LIKE ${schema.reactionRoles})`,
      );

      // Assumes this file inserts into `old_reaction_roles` (obviously, this
      // should be a file you generated and trust!)
      console.log("Copy: loading dump into temp table");
      // must have `pg_read_server_files`
      // GRANT pg_read_server_files TO your_username
      await tx.execute(sql.raw(`COPY old_reaction_roles FROM '${dumpfile}'`));

      console.log("Copy: creating necessary guild records");
      await tx.execute(
        sql.raw(`
          INSERT INTO "${db._.schema.discordGuilds.dbName}" (${schema.discordGuilds.id.name})
          SELECT DISTINCT (guild_id) FROM old_reaction_roles
          ON CONFLICT DO NOTHING
        `),
      );

      console.log("Copy: creating reaction role records");
      // We are assuming the column order is the same. I don't like this but I
      // couldn't get it to insert correctly when specifying columns.
      // Thankfully this is something we will run one time, ever, and we can
      // check that it's right beforehand.
      await tx.execute(
        sql.raw(`
          INSERT INTO "${db._.schema.reactionRoles.dbName}" 
          SELECT * FROM old_reaction_roles
          ON CONFLICT DO NOTHING
        `),
      );
    } catch (error) {
      // https://github.com/discohook/discohook/blob/a0fd10552e8a848f41b1bdac840464fd9de64020/packages/store/src/db.ts#L36-L39
      try {
        await tx.execute(sql`ROLLBACK`);
      } catch {}
      console.log("Error, rolled back");
      throw error;
    }
  });

  console.log("Finished");
  process.exit(0);
};

await main();
