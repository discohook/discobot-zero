import { type Client, Events } from "discord.js";
import type { Command } from "../commands/index.ts";
import type { Event } from "../events/index.ts";

export function registerEvents(
  commands: Map<string, Command>,
  events: Event[],
  client: Client,
): void {
  // Create an event to handle command interactions
  const interactionCreateEvent: Event<Events.InteractionCreate> = {
    name: Events.InteractionCreate,
    async execute(interaction) {
      console.log(interaction.user.id);
      if (interaction.isCommand()) {
        const command = commands.get(interaction.commandName);

        if (!command) {
          throw new Error(`Command '${interaction.commandName}' not found.`);
        }

        await command.execute(interaction);
      }
    },
  };

  for (const event of [...events, interactionCreateEvent]) {
    client[event.once ? "once" : "on"](event.name, event.execute);
  }
}
