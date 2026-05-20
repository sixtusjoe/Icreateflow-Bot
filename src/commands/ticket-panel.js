import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { buildPanelEmbed, openTicketRow } from '../utils/embeds.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Send the ticket open panel to this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
    const guild  = interaction.guild;
    const embed  = buildPanelEmbed(config, guild);
    const row    = openTicketRow(config.panel.button_label ?? 'Open Ticket');

    await interaction.reply({ content: '✅ Panel sent.', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  },
};
