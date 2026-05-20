import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { buildUserInfoEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View ticket owner profile and roles (staff only)')
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

    const member = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ Could not fetch the ticket owner — they may have left the server.', flags: MessageFlags.Ephemeral });
    }

    const embed = buildUserInfoEmbed(member, ticket, interaction.guild);
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
