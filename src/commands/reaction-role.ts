import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import type { REST } from "@discordjs/rest";
import { BitField } from "@sapphire/bitfield";
import {
  ButtonStyle,
  type APIGuildMember,
  PermissionFlagsBits,
  Routes,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIWebhook,
  type APIInteraction,
  type RESTPostAPIInteractionCallbackJSONBody,
  InteractionResponseType,
  type APIInteractionResponseCallbackData,
  MessageFlags,
  type RESTPostAPIInteractionCallbackWithResponseResult,
  type APIMessageComponentButtonInteraction,
  type APIActionRowComponent,
  type APIButtonComponent,
  type RESTPostAPIInteractionFollowupJSONBody,
} from "discord-api-types/v10";

const inviteUrl = `https://discord.com${Routes.oauth2Authorization()}?client_id=${process.env.MIGRATE_ID}&scope=bot+applications.commands`;

const PermissionsBitField = new BitField(PermissionFlagsBits);

const followup = (
  rest: REST,
  interaction: APIInteraction,
  body: RESTPostAPIInteractionFollowupJSONBody,
) =>
  rest.patch(
    Routes.webhookMessage(
      interaction.application_id,
      interaction.token,
      "@original",
    ),
    { body },
  );

export default {
  async execute(
    rest: REST,
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ) {
    await rest.post(
      Routes.interactionCallback(interaction.id, interaction.token),
      {
        body: {
          type: InteractionResponseType.DeferredChannelMessageWithSource,
          data: { flags: MessageFlags.Ephemeral },
        } satisfies RESTPostAPIInteractionCallbackJSONBody,
      },
    );

    let utilsMember: APIGuildMember | undefined;
    try {
      utilsMember = (await rest.get(
        Routes.guildMember(interaction.guild_id, process.env.MIGRATE_ID),
      )) as APIGuildMember;
    } catch {}

    let botWebhooks = -1;
    try {
      const webhooks = (await rest.get(
        Routes.guildWebhooks(interaction.guild_id),
      )) as APIWebhook[];
      botWebhooks = webhooks.filter(
        (w) => w.application_id === interaction.application_id,
      ).length;
    } catch {}

    if (utilsMember) {
      const leaveButton = new ButtonBuilder()
        .setCustomId("leave")
        .setStyle(ButtonStyle.Danger)
        .setLabel("Remove Discobot");
      const canRemoveBot =
        botWebhooks === 0 &&
        PermissionsBitField.has(
          BigInt(interaction.member.permissions),
          PermissionFlagsBits.KickMembers,
        );

      await followup(rest, interaction, {
        content: [
          "Hey there, thanks for using Discohook. We have switched bot",
          "accounts for all Discord features, which means",
          `<@${process.env.MIGRATE_ID}> is currently handling your reaction`,
          "roles (if it has appropriate permissions).\n\n",
          ...(botWebhooks === 0
            ? [
                "This server has no bot-owned webhooks, so you can remove this",
                `bot and use <@${process.env.MIGRATE_ID}> from now on.`,
              ]
            : botWebhooks === -1
              ? [
                  "If there are still webhooks owned by",
                  `<@${interaction.application_id}>, you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]
              : [
                  `There are still ${botWebhooks} webhooks owned by`,
                  `<@${interaction.application_id}>, so you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]),
        ].join(" "),
        components: canRemoveBot
          ? [
              new ActionRowBuilder<ButtonBuilder>()
                .addComponents(leaveButton)
                .toJSON(),
            ]
          : [],
      });
    } else {
      await followup(rest, interaction, {
        content: [
          "Hey there, thanks for using Discohook. We have switched bot",
          "accounts for all in-Discord features (like reaction roles),",
          "so you should invite our other bot for all future use.\n\n",
          ...(botWebhooks === 0
            ? [
                "After you invite that bot, feel free to remove this one.",
                "It won't be needed for anything else since this server has",
                "no bot-owned webhooks.",
              ]
            : botWebhooks === -1
              ? [
                  "If there are still webhooks owned by",
                  `<@${interaction.application_id}>, you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]
              : [
                  `There are still ${botWebhooks} webhooks owned by`,
                  `<@${interaction.application_id}>, so you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]),
        ].join(" "),
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Invite Bot")
                .setURL(inviteUrl),
            )
            .toJSON(),
        ],
      });
    }
  },
  buttons: {
    leave: async (
      rest: REST,
      interaction: APIMessageComponentButtonInteraction,
    ) => {
      if (!interaction.guild_id) return;

      const canKick = PermissionsBitField.has(
        BigInt(interaction.member.permissions),
        PermissionFlagsBits.KickMembers,
      );
      if (!canKick) return;

      const row = new ActionRowBuilder<ButtonBuilder>(
        interaction.message
          .components[0] as APIActionRowComponent<APIButtonComponent>,
      );
      row.components[0].setDisabled(true);

      await rest.post(
        Routes.interactionCallback(interaction.id, interaction.token),
        {
          body: {
            type: InteractionResponseType.UpdateMessage,
            data: { components: [row.toJSON()] },
          } satisfies RESTPostAPIInteractionCallbackJSONBody,
        },
      );
      await rest.delete(Routes.userGuild(interaction.guild_id));
      console.log("left", interaction.guild_id);
    },
  },
};
