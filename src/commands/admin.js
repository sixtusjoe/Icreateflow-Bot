import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin control panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));

  const embed = new EmbedBuilder()
    .setColor(0xCCCC00)
    .setTitle('⚙️  Admin Control Panel')
    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
    .addFields(
      { name: '🎫  Tickets',      value: 'View live stats for all tickets',          inline: true },
      { name: '⚙️  Config',       value: 'Edit timers, retries & welcome message',   inline: true },
      { name: '🔄  Reload',       value: 'Hot-reload config without restarting',     inline: true },
      { name: '🔒  Close All',    value: 'Force-close every open ticket',            inline: true },
      { name: '📢  Post Panel',   value: 'Re-send the Open Ticket panel here',       inline: true },
      { name: '📨  Send Message', value: 'Send task or message to ticket channels',  inline: true },
    )
    .setFooter({ text: 'Only visible to you — use responsibly' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_stats').setLabel('Stats').setEmoji('📊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('admin_edit_config').setLabel('Edit Config').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('admin_reload').setLabel('Reload Config').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_close_all').setLabel('Close All Tickets').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('admin_post_panel').setLabel('Post Panel Here').setEmoji('📢').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('admin_send_message').setLabel('Send Message').setEmoji('📨').setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}
