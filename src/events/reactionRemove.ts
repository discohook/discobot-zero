import { Events, PermissionFlagsBits, Routes } from "discord.js";
import type { Event } from "./index.ts";
import { getReactionRoleId } from "./reactionAdd.js";

export default {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (user.bot) return;
    const data = await getReactionRoleId(reaction);
    if (data === null) return;
    const { roleId, position } = data;

    // Try to reduce double requests by guessing whether dutils will handle the event
    // const dutilsMember = reaction.message.guild.members.cache.get(
    //   process.env.MIGRATE_TO,
    // );
    // if (
    //   // biome-ignore lint/complexity/useOptionalChain: Confusing
    //   dutilsMember &&
    //   dutilsMember.permissions.has(PermissionFlagsBits.ManageRoles) &&
    //   dutilsMember.roles.highest.position > position
    // ) {
    //   return;
    // }

    try {
      await reaction.client.rest.delete(
        Routes.guildMemberRole(reaction.message.guildId, user.id, roleId),
        {
          reason: `Reaction role in channel ID ${reaction.message.channelId}. Migrate to Utils: /reaction-role`,
        },
      );
    } catch (e) {
      console.error(e);
    }
  },
} satisfies Event<Events.MessageReactionRemove>;
