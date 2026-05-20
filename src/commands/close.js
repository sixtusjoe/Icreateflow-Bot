import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { closeTicket } from '../handlers/ticketHandler.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this ticket (staff only)')
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for closing').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
    const ticket = getTicket(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({ content: '❌ This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    if (!isStaff(interaction.member, config)) {
      return interaction.reply({ content: '❌ Only staff can use this command.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') ?? 'Closed by staff';
    await interaction.reply({ content: '🔒 Closing ticket…', flags: MessageFlags.Ephemeral });
    await closeTicket(interaction.client, config, interaction.channel.id, reason, { actorId: interaction.user.id });
  },
};
