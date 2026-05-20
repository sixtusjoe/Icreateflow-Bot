import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { buildPanelEmbed } from '../utils/embeds.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminPostPanel(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const embed  = buildPanelEmbed(config, interaction.guild);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel(config.panel.button_label ?? 'Open Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎫')
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Panel posted in this channel.', flags: MessageFlags.Ephemeral });
}
