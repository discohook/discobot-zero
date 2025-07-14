import { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
  ActivityType,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIInteraction,
  GatewayDispatchEvents,
  GatewayIntentBits,
  InteractionType,
  PresenceUpdateStatus,
} from "discord-api-types/v10";
import { configDotenv } from "dotenv";
import reactionAdd from "./events/reactionAdd.js";
import reactionRemove from "./events/reactionRemove.js";
import reactionRoleCmd from "./commands/reaction-role.js";
import { ArgumentParser } from "argparse";

// const APPROX_GUILDS = 325_000;
// const SHARD_COUNT = Math.floor(APPROX_GUILDS / 1500);
const SHARD_COUNT = 224; // must be a multiple of 16 for large bot sharding - above is 216
const CLUSTER_COUNT = 4;
const SHARDS_PER_CLUSTER = Math.floor(SHARD_COUNT / CLUSTER_COUNT);
const DEV = process.env.ENVIRONMENT === "development";

const argparser = new ArgumentParser();
argparser.add_argument("--cluster", {
  help: "zero-indexed cluster ID",
  required: !DEV,
  choices: Array(CLUSTER_COUNT)
    .fill(undefined)
    .map((_, i) => String(i)),
});

const cluster = Number(argparser.parse_args().cluster ?? 0);
// const ALL_SHARD_IDS = Array(SHARD_COUNT)
//   .fill(undefined)
//   .map((_, i) => i);
// const SHARD_IDS = ALL_SHARD_IDS.slice(
//   cluster * SHARDS_PER_CLUSTER,
//   Math.min((cluster + 1) * SHARDS_PER_CLUSTER, SHARD_COUNT),
// );

configDotenv();

export interface Env {
  APPLICATION_ID: string;
  MIGRATE_ID: string;
  DISCORD_TOKEN: string;
  DATABASE_URL: string;
}
const env = process.env as unknown as Env;

if (!env.DISCORD_TOKEN) {
  throw Error("Missing required environment variables. Refer to README.");
}

const guildIds: string[] = [];

const rest = new REST().setToken(env.DISCORD_TOKEN);
const manager = new WebSocketManager({
  token: env.DISCORD_TOKEN,
  intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessageReactions,
  rest,
  initialPresence: {
    status: PresenceUpdateStatus.Idle,
    activities: [
      {
        name: "Custom",
        state: "Migrate! discohook.app/guide/deprecated/migrate-utils",
        type: ActivityType.Custom,
      },
    ],
    afk: false,
    since: null,
  },
  ...(DEV
    ? { shardCount: null }
    : {
        shardCount: SHARD_COUNT,
        shardIds: {
          start: cluster * SHARDS_PER_CLUSTER,
          end: Math.min((cluster + 1) * SHARDS_PER_CLUSTER, SHARD_COUNT) - 1,
        },
      }),
});
// debug
// console.log(manager.getShardIds());

manager.on(WebSocketShardEvents.Ready, (event, shardId) => {
  guildIds.push(
    ...event.guilds.map((g) => g.id).filter((id) => !guildIds.includes(id)),
  );
  const shards = event.shard ? event.shard[1] : 0;
  console.log(
    `${event.user.username}#${
      event.user.discriminator
    } ready on cluster ${cluster}, shard ID ${shardId} (of ${shards}) with ${
      event.guilds.length
    } guilds`,
  );
});

manager.on(WebSocketShardEvents.Hello, (shardId) => {
  console.log(`[hello] Cluster ${cluster}, Shard ${shardId}`);
});

manager.on(WebSocketShardEvents.Resumed, (shardId) => {
  console.log(`[resumed] Cluster ${cluster}, Shard ${shardId}`);
});

manager.on(WebSocketShardEvents.Closed, (_, shardId) => {
  console.log(`[closed] Cluster ${cluster}, Shard ${shardId}`);
});

manager.on(WebSocketShardEvents.Error, (error, shardId) => {
  console.error(`[error] Cluster ${cluster}, Shard ${shardId}:`, error);
});

const interactionCreate = async (data: APIInteraction) => {
  if (!data.guild_id) return;
  if (
    data.type === InteractionType.ApplicationCommand &&
    data.data.name === "reaction-role"
  ) {
    await reactionRoleCmd.execute(
      rest,
      data as APIChatInputApplicationCommandGuildInteraction,
    );
  } else if (data.type === InteractionType.MessageComponent) {
    const callback = reactionRoleCmd.buttons[data.data.custom_id];
    if (callback) {
      await callback(rest, data);
    }
  }
};

manager.on(WebSocketShardEvents.Dispatch, async (event, shardId) => {
  if (
    ![
      // Guild state (internal and db)
      GatewayDispatchEvents.GuildCreate,
      GatewayDispatchEvents.GuildDelete,
      // Reaction roles
      GatewayDispatchEvents.MessageReactionAdd,
      GatewayDispatchEvents.MessageReactionRemove,
      // Notice command
      GatewayDispatchEvents.InteractionCreate,
    ].includes(event.t)
  ) {
    return;
  }

  try {
    switch (event.t) {
      case GatewayDispatchEvents.GuildCreate: {
        if (!guildIds.includes(event.d.id)) {
          guildIds.push(event.d.id);
        }
        // await guildCreate.execute(event.d);
        return;
      }
      case GatewayDispatchEvents.GuildDelete: {
        // hard to know whether utils is in this server without querying with
        // its token, so we can't reliably delete its records right now
        if (event.d.unavailable) break;
        const index = guildIds.indexOf(event.d.id);
        if (index !== -1) guildIds.splice(index, 1);
        return;
      }
      case GatewayDispatchEvents.MessageReactionAdd:
        await reactionAdd.execute(rest, event.d);
        return;
      case GatewayDispatchEvents.MessageReactionRemove:
        await reactionRemove.execute(rest, event.d);
        return;
      case GatewayDispatchEvents.InteractionCreate:
        await interactionCreate(event.d);
        return;
      default:
        break;
    }
  } catch (e) {
    console.error(e);
  }
});

(async () => {
  await manager.connect();
})();
