import { getReactionRoleId } from "./reactionAdd.js";
import {
  Routes,
  type GatewayMessageReactionRemoveDispatchData,
} from "discord-api-types/v10";
import type { REST } from "@discordjs/rest";

export default {
  async execute(
    rest: REST,
    reaction: GatewayMessageReactionRemoveDispatchData,
  ) {
    if (!reaction.guild_id) return;

    const data = await getReactionRoleId(rest, reaction);
    if (data === null) return;
    const { roleId } = data;

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
      await rest.delete(
        Routes.guildMemberRole(reaction.guild_id, reaction.user_id, roleId),
        {
          reason: `Reaction role in channel ID ${reaction.channel_id}. Migrate to Utils: /reaction-role`,
        },
      );
    } catch (e) {
      console.error(e);
    }
  },
};
