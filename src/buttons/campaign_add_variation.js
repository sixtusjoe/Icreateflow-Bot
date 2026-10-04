import { MessageFlags } from 'discord.js';
import { incrementVariation } from '../db/database.js';

export default async function campaignAddVariation(interaction) {
  const newVariation = incrementVariation(interaction.user.id, interaction.guildId);
  await interaction.reply({
    content: `➕ **Variation ${newVariation} started!**\n\nUse the platform buttons above to add accounts to this variation.`,
    flags: MessageFlags.Ephemeral,
  });
}
