import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketsByStatus, getOpenTicketForUser } from '../db/database.js';
import { sendTaskAssignment } from '../handlers/taskHandler.js';
import { log } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminTaskModal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config       = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  // Target is encoded in the customId: admin_task_modal|{userId|all}
  const target       = interaction.customId.split('|')[1] ?? 'all';
  const stage1Mins   = parseInt(interaction.fields.getTextInputValue('stage1_minutes').trim());
  const stage2Days   = parseInt(interaction.fields.getTextInputValue('stage2_days').trim());
  const instructions = interaction.fields.getTextInputValue('instructions');
  const stage2Msg    = interaction.fields.getTextInputValue('stage2_message');

  if (isNaN(stage1Mins) || isNaN(stage2Days)) {
    return interaction.editReply({ content: '❌ Stage 1 minutes and Stage 2 days must be numbers.' });
  }

  // Determine which channels to send to
  let channelIds = [];

  if (target === 'all') {
    const tickets = getTicketsByStatus('in_task');
    channelIds = tickets.map(t => t.channel_id);
  } else {
    // target is a user ID
    const ticket = getOpenTicketForUser(target);
    if (!ticket) {
      return interaction.editReply({ content: `❌ No open ticket found for user <@${target}>.` });
    }
    channelIds = [ticket.channel_id];
  }

  if (channelIds.length === 0) {
    return interaction.editReply({ content: '❌ No matching tickets found.' });
  }

  let sent = 0, failed = 0;
  for (const channelId of channelIds) {
    try {
      await sendTaskAssignment(interaction.client, config, channelId, {
        stage1Minutes: stage1Mins,
        stage2Days,
        instructions,
        stage2Message: stage2Msg,
      });
      sent++;
    } catch (err) {
      log.error(`[adminTaskModal] Failed to send task to ${channelId}: ${err.message}`);
      failed++;
    }
  }

  log.info(`[admin] Task sent by ${interaction.user.tag} to ${sent} ticket(s)`);
  await interaction.editReply({
    content: `✅ Task sent to **${sent}** ticket(s)${failed ? ` (${failed} failed)` : ''}.`,
  });
}
