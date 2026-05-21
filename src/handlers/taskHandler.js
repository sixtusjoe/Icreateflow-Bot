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

/**
 * Strip any colour icon prefix from a channel name and return the clean base name.
 */
export function stripChannelIcon(name) {
  return name.replace(/^[🔴🟠🔵✅⚠️]+[-\s]*/u, '').replace(/^[-\s]+/, '');
}

/**
 * Rename a channel with a new icon prefix, preserving the base name.
 */
export async function setChannelIcon(channel, icon) {
  const cleanName = stripChannelIcon(channel.name);
  await channel.setName(`${icon}-${cleanName}`).catch(err =>
    log.warn(`[taskHandler] Failed to rename channel: ${err.message}`)
  );
}

/**
 * Send a task assignment to a single ticket channel and start the stage-1 timer.
 */
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

  const guild = channel.guild;
  const userId = ticket.user_id;

  const rendered = renderString(instructions, {
    user:            userId,
    stage1_minutes:  stage1Minutes,
    stage2_days:     stage2Days,
  });

  const embed = buildTaskAssignmentEmbed(rendered, stage1Minutes, userId, guild);
  await channel.send({ content: `<@${userId}>`, embeds: [embed] });

  const expiresAt = Date.now() + stage1Minutes * 60 * 1000;
  updateTicket(channelId, {
    taskStage:          'awaiting_tiktok',
    taskStageExpiresAt: expiresAt,
  });

  await setChannelIcon(channel, '🔴');

  insertEvent({ channelId, eventType: 'task_assigned', metadata: { stage1Minutes, stage2Days } });
  await logEvent('task_assigned', { Channel: `<#${channelId}>`, Owner: `<@${userId}>`, Stage1: `${stage1Minutes}min` }, { channelId });

  log.info(`[taskHandler] Task assigned to ${channelId} — stage1: ${stage1Minutes}min, stage2: ${stage2Days}days`);
}

/**
 * Called from messageCreate whenever the ticket owner sends a message and task_stage is active.
 * Advances the task stage if the right link is detected.
 */
export async function advanceTaskStage(client, config, ticket, message) {
  const { channelId, channel_id, user_id, task_stage } = ticket;
  const chId = channelId ?? channel_id;
  const content = message.content ?? '';

  if (task_stage === 'awaiting_tiktok') {
    if (!TIKTOK_RE.test(content)) return; // not a TikTok link

    const stage2Days = config.task?.stage2_timer_days ?? 6;
    const expiresAt  = Date.now() + stage2Days * 24 * 60 * 60 * 1000;

    updateTicket(chId, {
      taskStage:          'awaiting_drive',
      taskStageExpiresAt: expiresAt,
    });

    const channel = message.channel;
    const guild   = channel.guild;

    const stage2Text = renderString(config.task?.stage2_message ?? '✅ TikTok received! Submit Drive link.', {
      user:       user_id,
      stage2_days: stage2Days,
    });

    const embed = buildStage2MessageEmbed(stage2Text, stage2Days, guild);
    await channel.send({ content: `<@${user_id}>`, embeds: [embed] });
    await setChannelIcon(channel, '🟠');

    // Move to Interviewing category if configured
    const interviewingId = config.categories?.interviewing;
    if (interviewingId) {
      await channel.setParent(interviewingId, { lockPermissions: false }).catch(err =>
        log.warn(`[taskHandler] Failed to move channel to Interviewing: ${err.message}`)
      );
    }

    insertEvent({ channelId: chId, eventType: 'task_stage1_complete' });
    await logEvent('task_stage1_complete', { Channel: `<#${chId}>`, Owner: `<@${user_id}>` }, { channelId: chId });
    log.info(`[taskHandler] Stage 1 complete for ${chId} — advancing to awaiting_drive`);

  } else if (task_stage === 'awaiting_drive') {
    if (!DRIVE_RE.test(content)) return; // not a Drive link

    updateTicket(chId, {
      taskStage:          'drive_submitted',
      taskStageExpiresAt: null,
    });

    const channel = message.channel;
    const guild   = channel.guild;

    const completedText = renderString(config.task?.completed_message ?? '🔵 Drive link received!', {
      user: user_id,
    });

    const embed = buildDriveSubmittedEmbed(completedText, guild);
    await channel.send({ content: `<@${user_id}>`, embeds: [embed] });
    await setChannelIcon(channel, '🔵');

    // Move to Under Review category if configured
    const underReviewId = config.categories?.under_review;
    if (underReviewId) {
      await channel.setParent(underReviewId, { lockPermissions: false }).catch(err =>
        log.warn(`[taskHandler] Failed to move channel to Under Review: ${err.message}`)
      );
    }

    insertEvent({ channelId: chId, eventType: 'task_stage2_complete' });
    await logEvent('task_stage2_complete', { Channel: `<#${chId}>`, Owner: `<@${user_id}>` }, { channelId: chId });
    log.info(`[taskHandler] Stage 2 complete for ${chId} — drive link submitted`);
  }
}
