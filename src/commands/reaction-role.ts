import type { Command } from "./index.ts";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type GuildMember,
  PermissionFlagsBits,
  PermissionsBitField,
  RouteBases,
  Routes,
} from "discord.js";

const inviteUrl = `${RouteBases.api}${Routes.oauth2Authorization()}?client_id=${process.env.MIGRATE_ID}`;

export default {
  data: {
    name: "reaction-role",
    description: "Reaction roles are no longer managed through this bot!",
    dm_permission: false,
    default_member_permissions: new PermissionsBitField(
      PermissionFlagsBits.ManageMessages | PermissionFlagsBits.AddReactions,
    ).toJSON(),
  },
  async execute(interaction) {
    let utilsMember: GuildMember | undefined;
    try {
      utilsMember = await interaction.guild.members.fetch(
        process.env.MIGRATE_ID,
      );
    } catch {}

    let botWebhooks = -1;
    try {
      const webhooks = await interaction.guild.fetchWebhooks();
      botWebhooks = webhooks.filter(
        (w) => w.applicationId === interaction.client.application.id,
      ).size;
    } catch {}

    if (utilsMember) {
      const leaveButton = new ButtonBuilder()
        .setCustomId("leave")
        .setStyle(ButtonStyle.Danger)
        .setLabel("Leave");
      const canRemoveBot =
        botWebhooks === 0 &&
        interaction.memberPermissions.has(PermissionFlagsBits.KickMembers);

      const response = await interaction.reply({
        content: [
          "Hey there, thanks for using Discohook. We have switched bot",
          "accounts for all Discord features, which means",
          `<@${process.env.MIGRATE_ID}> is currently handling your reaction`,
          "roles.\n\n",
          ...(botWebhooks === 0
            ? [
                "This server has no bot-owned webhooks, so you can remove this",
                `bot and use <@${process.env.MIGRATE_ID}> from now on.`,
              ]
            : botWebhooks === -1
              ? [
                  "If there are still webhooks owned by",
                  `<@${interaction.client.user.id}>, you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]
              : [
                  `There are still ${botWebhooks} webhooks owned by`,
                  `<@${interaction.client.user.id}>, so you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]),
        ].join(" "),
        components: canRemoveBot
          ? [new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton)]
          : [],
        ephemeral: true,
      });

      if (canRemoveBot) {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          leaveButton.setDisabled(true),
        );
        try {
          await response.awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i) =>
              i.customId === "leave" && i.user.id === interaction.user.id,
            interactionResponse: response,
            time: 600000,
          });
          await response.edit({
            components: [disabledRow],
          });
          // await interaction.guild.leave();
          console.log("leave");
        } catch {
          await response.edit({
            components: [disabledRow],
          });
        }
      }
    } else {
      await interaction.reply({
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
                  `<@${interaction.client.user.id}>, you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]
              : [
                  `There are still ${botWebhooks} webhooks owned by`,
                  `<@${interaction.client.user.id}>, so you should not remove`,
                  "this bot. Doing so will delete those webhooks.",
                ]),
        ].join(" "),
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("Invite Bot")
              .setURL(inviteUrl),
          ),
        ],
        ephemeral: true,
      });
    }
  },
} satisfies Command;
