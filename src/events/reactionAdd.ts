import {
  type GatewayMessageReactionRemoveDispatchData,
  Routes,
  type GatewayMessageReactionAddDispatchData,
  type APIRole,
} from "discord-api-types/v10";
import { db, keyv } from "../singletons.js";
import type { REST } from "@discordjs/rest";

export interface ReactionRoleData {
  roleId: string | null;
  position?: number;
}

export const getReactionRoleId = async (
  rest: REST,
  reaction:
    | GatewayMessageReactionAddDispatchData
    | GatewayMessageReactionRemoveDispatchData,
): Promise<ReactionRoleData> => {
  if (!reaction.guild_id) return null;

  const emoji = reaction.emoji.id || reaction.emoji.name;
  const key = `reaction-role:${reaction.message_id}:${emoji}`;
  const data = await keyv.get<ReactionRoleData>(key);

  if (data) {
    if (data.roleId === null) {
      return null;
    }
    return data;
  }
  const rr = await db.query.reactionRoles.findFirst({
    where: (table, { and, eq }) =>
      and(
        eq(table.messageId, BigInt(reaction.message_id)),
        eq(table.reaction, emoji),
      ),
    columns: { roleId: true },
  });
  if (!rr) {
    await keyv.set(key, { roleId: null }, 600_000);
    return null;
  }

  const roleId = String(rr.roleId);
  let role: APIRole;
  try {
    role = (await rest.get(
      Routes.guildRole(reaction.guild_id, roleId),
    )) as APIRole;
  } catch {
    await keyv.set(key, { roleId: null }, 600_000);
    return null;
  }

  const setData: ReactionRoleData = { roleId, position: role.position };
  await keyv.set(key, setData, 600_000);
  if (!rr) return null;

  return setData;
};

export default {
  async execute(rest: REST, reaction: GatewayMessageReactionAddDispatchData) {
    if (!reaction.guild_id || reaction.member?.user?.bot) return;

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
      await rest.put(
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
