import { URL } from "node:url";
import { ShardingManager, type Shard } from "discord.js";

const manager = new ShardingManager(
  new URL("bot.js", import.meta.url).pathname,
  { token: process.env.DISCORD_TOKEN },
);

manager.on("shardCreate", (shard: Shard) =>
  console.log(`Launched shard ${shard.id}`),
);

manager.spawn();
