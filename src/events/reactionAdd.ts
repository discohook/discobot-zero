import {
  Events,
  type MessageReaction,
  type PartialMessageReaction,
  PermissionFlagsBits,
  type Role,
  Routes,
} from "discord.js";
import type { Event } from "./index.ts";
import { db, keyv } from "../singletons.js";

export interface ReactionRoleData {
  roleId: string | null;
  position?: number;
}

export const getReactionRoleId = async (
  reaction: MessageReaction | PartialMessageReaction,
): Promise<ReactionRoleData> => {
  if (!reaction.message.guildId) {
    return null;
  }

  const emoji = reaction.emoji.id || reaction.emoji.name;
  const key = `reaction-role:${reaction.message.id}:${emoji}`;
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
        eq(table.messageId, BigInt(reaction.message.id)),
        eq(table.reaction, emoji),
      ),
    columns: { roleId: true },
  });
  if (!rr) {
    await keyv.set(key, { roleId: null }, 600_000);
    return null;
  }

  const roleId = String(rr.roleId);
  let role: Role;
  try {
    role = await reaction.message.guild.roles.fetch(roleId);
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
  name: Events.MessageReactionAdd,
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
      await reaction.client.rest.put(
        Routes.guildMemberRole(reaction.message.guildId, user.id, roleId),
        {
          reason: `Reaction role in channel ID ${reaction.message.channelId}. Migrate to Utils: /reaction-role`,
        },
      );
    } catch (e) {
      console.error(e);
    }
  },
} satisfies Event<Events.MessageReactionAdd>;
