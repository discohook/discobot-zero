import process from "node:process";
import { URL } from "node:url";
import { API } from "@discordjs/core";
import { REST } from "discord.js";
import { loadCommands } from "./loaders.js";
import { z } from "zod";

const env = z
  .object({
    DISCORD_TOKEN: z.string(),
    APPLICATION_ID: z.string(),
    MIGRATE_ID: z.string(),
    DATABASE_URL: z.string(),
  })
  .parse(process.env);

const commands = await loadCommands(new URL("../commands/", import.meta.url));
const commandData = [...commands.values()].map((command) => command.data);

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
const api = new API(rest);

const result = await api.applicationCommands.bulkOverwriteGlobalCommands(
  env.APPLICATION_ID,
  commandData,
);

console.log(`Successfully registered ${result.length} commands.`);
