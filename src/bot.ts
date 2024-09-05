import process from "node:process";
import { URL } from "node:url";
import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayDispatchEvents,
  GatewayIntentBits,
  Options,
  Partials,
  PresenceUpdateStatus,
} from "discord.js";
import { loadCommands, loadEvents } from "./util/loaders.js";
import { registerEvents } from "./util/registerEvents.js";

// Initialize the client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Reaction,
    Partials.User,
  ],
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    GuildMemberManager: {
      keepOverLimit: (member) =>
        member.id === member.client.user.id ||
        member.id === process.env.MIGRATE_TO,
      maxSize: 0,
    },
  }),
  presence: {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Migrate! discohook.app/guide/deprecated/migrate-utils",
      },
    ],
    status: PresenceUpdateStatus.Idle,
  },
});

// Load the events and commands
const events = await loadEvents(new URL("events/", import.meta.url));
const commands = await loadCommands(new URL("commands/", import.meta.url));

// Register the event handlers
registerEvents(commands, events, client);

// Login to the client
void client.login(process.env.DISCORD_TOKEN);
