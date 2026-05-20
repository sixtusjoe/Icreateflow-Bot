import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { isStaff } from '../utils/permissions.js';
import { logEvent } from '../handlers/logHandler.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  data: new SlashCommandBuilder()
    .setName('assign-role')
    .setDescription('Assign a role to the ticket owner (staff only)')
    .addRoleOption(opt =>
      opt.setName('role').setDescription('Role to assign').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
    const ticket = getTicket(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({ content: '❌ This channel is not a ticket.', flags: MessageFlags.Ephemeral });
    }

    if (!isStaff(interaction.member, config)) {
      return interaction.reply({ content: '❌ Only staff can assign roles.', flags: MessageFlags.Ephemeral });
    }

    const role   = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ Ticket owner not found in server.', flags: MessageFlags.Ephemeral });
    }

    await member.roles.add(role.id);
    await logEvent(
      'role_assigned',
      { Role: `<@&${role.id}>`, Owner: `<@${ticket.user_id}>`, Staff: `<@${interaction.user.id}>`, Channel: `<#${interaction.channel.id}>` },
      { channelId: interaction.channel.id, actorId: interaction.user.id, metadata: { roleId: role.id } }
    );

    return interaction.reply({
      content: `✅ Assigned **${role.name}** to <@${ticket.user_id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
