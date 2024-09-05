import { Events } from "discord.js";
import type { Event } from "./index.ts";

export default {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log("CREATE", guild.id);
    try {
      // Force cache the utils app so that it can be queried via cache later
      await guild.members.fetch(process.env.MIGRATE_ID);
    } catch {}
  },
} satisfies Event<Events.GuildCreate>;
