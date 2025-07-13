import process from "node:process";
import { REST } from "@discordjs/rest";
import { z } from "zod";
import {
  PermissionFlagsBits,
  type RESTPutAPIApplicationCommandsJSONBody,
  type RESTPutAPIApplicationCommandsResult,
  Routes,
} from "discord-api-types/v10";

const env = z
  .object({
    DISCORD_TOKEN: z.string(),
    APPLICATION_ID: z.string(),
    MIGRATE_ID: z.string(),
    DATABASE_URL: z.string(),
  })
  .parse(process.env);

const commands: RESTPutAPIApplicationCommandsJSONBody = [
  {
    name: "reaction-role",
    description: "Reaction roles are no longer managed through this bot!",
    dm_permission: false,
    default_member_permissions: (
      PermissionFlagsBits.ManageMessages | PermissionFlagsBits.AddReactions
    ).toString(),
  },
];

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
const result = (await rest.put(Routes.applicationCommands(env.APPLICATION_ID), {
  body: commands,
})) as RESTPutAPIApplicationCommandsResult;

console.log(`Successfully registered ${result.length} commands.`);
