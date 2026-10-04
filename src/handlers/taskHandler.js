import { updateTicket, insertEvent } from '../db/database.js';
import {
  buildTaskAssignmentEmbed,
  buildStage2MessageEmbed,
  buildDriveSubmittedEmbed,
} from '../utils/embeds.js';
import { renderString } from '../utils/templates.js';
import { logEvent } from './logHandler.js';
import { log } from '../utils/logger.js';

const TIKTOK_RE  = /tiktok\.com\//i;
const DRIVE_RE   = /drive\.google\.com\//i;

export function stripChannelIcon(name) {
  return name.replace(/^[🔴🟠🔵✅⚠️]+[-\s]*/u, '').replace(/^[-\s]+/, '');
}

// Fire-and-forget: rename and category move run independently so a rate-limited
// rename never blocks the category move.
function applyChannelAppearance(channel, icon, categoryId) {
  const cleanName = stripChannelIcon(channel.name);
  const newName   = `${icon}-${cleanName}`;

  log.info(`[taskHandler] applyChannelAppearance → rename to "${newName}", move to category ${categoryId ?? 'none'}`);

  // Rename independently — may be queued by Discord rate limit
  channel.setName(newName)
    .then(() => log.info(`[taskHandler] rename OK → ${newName}`))
    .catch(err => log.warn(`[taskHandler] rename failed: ${err.message}`));

  // Category move fires immediately regardless of rename rate limit
  if (categoryId) {
    channel.setParent(categoryId, { lockPermissions: false })
      .then(() => log.info(`[taskHandler] category move OK → ${categoryId}`))
      .catch(err => log.warn(`[taskHandler] category move failed: ${err.message}`));
  }
}

export async function setChannelIcon(channel, icon) {
  const cleanName = stripChannelIcon(channel.name);
  await channel.setName(`${icon}-${cleanName}`).catch(err =>
    log.warn(`[taskHandler] Failed to rename channel: ${err.message}`)
  );
}

export async function sendTaskAssignment(client, config, channelId, opts = {}) {
  const {
    stage1Minutes = config.task?.stage1_timer_minutes ?? 60,
    stage2Days    = config.task?.stage2_timer_days    ?? 6,
    instructions  = config.task?.instructions ?? '📋 You have been assigned a task.',
    stage2Message = config.task?.stage2_message ?? '✅ TikTok link received! Submit your Drive link.',
  } = opts;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const { getTicket } = await import('../db/database.js');
  const ticket = getTicket(channelId);
  if (!ticket) return;

  const guild  = channel.guild;
  const userId = ticket.user_id;

  const rendered = renderString(instructions, {
    user:           userId,
    stage1_minutes: stage1Minutes,
    stage2_days:    stage2Days,
  });

  const embed = buildTaskAssignmentEmbed(rendered, stage1Minutes, userId, guild);
  await channel.send({ content: `<@${userId}>`, embeds: [embed] });

  const expiresAt = Date.now() + stage1Minutes * 60 * 1000;
  updateTicket(channelId, {
    taskStage:          'awaiting_tiktok',
    taskStageExpiresAt: expiresAt,
  });

  insertEvent({ channelId, eventType: 'task_assigned', metadata: { stage1Minutes, stage2Days } });
  await logEvent('task_assigned', { Channel: `<#${channelId}>`, Owner: `<@${userId}>`, Stage1: `${stage1Minutes}min` }, { channelId });
  log.info(`[taskHandler] Task assigned to ${channelId} — stage1: ${stage1Minutes}min, stage2: ${stage2Days}days`);

  // Background: rename + no category move needed for initial assignment
  applyChannelAppearance(channel, '🔴', null);
}

export async function advanceTaskStage(client, config, ticket, message) {
  const { channelId, channel_id, user_id, task_stage } = ticket;
  const chId    = channelId ?? channel_id;
  const content = message.content ?? '';
  const channel = message.channel;
  const guild   = channel.guild;

  if (task_stage === 'awaiting_tiktok') {
    if (!TIKTOK_RE.test(content)) return;

    const stage2Days = config.task?.stage2_timer_days ?? 6;
    const expiresAt  = Date.now() + stage2Days * 24 * 60 * 60 * 1000;

    // Update DB first
    updateTicket(chId, { taskStage: 'awaiting_drive', taskStageExpiresAt: expiresAt });

    // Send stage 2 instructions
    const stage2Text = renderString(config.task?.stage2_message ?? '✅ TikTok received! Submit Drive link.', {
      user:        user_id,
      stage2_days: stage2Days,
    });
    const embed = buildStage2MessageEmbed(stage2Text, stage2Days, guild);
    await channel.send({ content: `<@${user_id}>`, embeds: [embed] });

    // Record completion immediately — before any rate-limited channel ops
    insertEvent({ channelId: chId, eventType: 'task_stage1_complete' });
    await logEvent('task_stage1_complete', { Channel: `<#${chId}>`, Owner: `<@${user_id}>` }, { channelId: chId });
    log.info(`[taskHandler] Stage 1 complete for ${chId} — advancing to awaiting_drive`);

    // Background: rename + move to Interviewing (may be rate-limited, doesn't block stage recording)
    applyChannelAppearance(channel, '🟠', config.categories?.interviewing ?? null);

  } else if (task_stage === 'awaiting_drive') {
    if (!DRIVE_RE.test(content)) return;

    // Update DB first
    updateTicket(chId, { taskStage: 'drive_submitted', taskStageExpiresAt: null });

    // Send completion message
    const completedText = renderString(config.task?.completed_message ?? '🔵 Drive link received!', {
      user: user_id,
    });
    const embed = buildDriveSubmittedEmbed(completedText, guild);
    await channel.send({ content: `<@${user_id}>`, embeds: [embed] });

    // Record completion immediately — before any rate-limited channel ops
    insertEvent({ channelId: chId, eventType: 'task_stage2_complete' });
    await logEvent('task_stage2_complete', { Channel: `<#${chId}>`, Owner: `<@${user_id}>` }, { channelId: chId });
    log.info(`[taskHandler] Stage 2 complete for ${chId} — drive link submitted`);

    // Background: rename + move to Under Review (may be rate-limited, doesn't block stage recording)
    applyChannelAppearance(channel, '🔵', config.categories?.under_review ?? null);
  }
}
