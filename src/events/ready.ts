import { Events } from "discord.js";
import type { Event } from "./index.ts";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(
      `Ready as ${client.user.tag} on ${client.guilds.cache.size} guilds`,
    );
  },
} satisfies Event<Events.ClientReady>;
