import { MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { buildUserInfoEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function userInfo(interaction) {
  const config    = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const channelId = interaction.customId.split('|')[1] || interaction.channel.id;
  const ticket    = getTicket(channelId);

  if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', flags: MessageFlags.Ephemeral });
  if (!isStaff(interaction.member, config)) return interaction.reply({ content: '❌ Only staff can view user info.', flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
  if (!member) return interaction.reply({ content: '❌ Ticket owner not found — they may have left the server.', flags: MessageFlags.Ephemeral });

  const embed = buildUserInfoEmbed(member, ticket, interaction.guild);
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
