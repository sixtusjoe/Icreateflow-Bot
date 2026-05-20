import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AttachmentBuilder } from 'discord.js';
import { log } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRANSCRIPTS_DIR = join(__dirname, '../../transcripts');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDiscordTimestamp(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

async function fetchAllMessages(channel) {
  const messages = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    messages.push(...batch.values());
    lastId = batch.last().id;
  }

  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function buildText(messages, channelName, ticketOwnerTag) {
  const divider = '─'.repeat(60);
  const header = [
    divider,
    `  TICKET TRANSCRIPT — #${channelName}`,
    `  Owner: ${ticketOwnerTag}`,
    `  Messages: ${messages.length}`,
    `  Generated: ${new Date().toUTCString()}`,
    divider,
    '',
  ].join('\n');

  const rows = messages.map(msg => {
    const timestamp = formatDiscordTimestamp(msg.createdAt);
    const tag = msg.author.bot ? `[BOT] ${msg.author.tag}` : msg.author.tag;
    const content = msg.content || '';
    const embeds = msg.embeds.length > 0 ? `\n  [${msg.embeds.length} embed(s)]` : '';
    const attachments = msg.attachments.size > 0
      ? `\n  📎 ${[...msg.attachments.values()].map(a => a.name).join(', ')}`
      : '';
    return `[${timestamp}] ${tag}\n  ${content}${embeds}${attachments}`;
  }).join('\n\n');

  return header + rows + `\n\n${divider}\n  End of transcript\n${divider}`;
}


export async function generateTranscript(channel, ticket, client) {
  try {
    mkdirSync(TRANSCRIPTS_DIR, { recursive: true });

    const messages = await fetchAllMessages(channel);
    let ownerTag = ticket.user_id;
    try {
      const owner = await client.users.fetch(ticket.user_id);
      ownerTag = owner.tag;
    } catch {}

    const text = buildText(messages, channel.name, ownerTag);
    const filePath = join(TRANSCRIPTS_DIR, `${ticket.channel_id}.txt`);
    writeFileSync(filePath, text, 'utf8');

    return new AttachmentBuilder(filePath, { name: `transcript-${channel.name}.txt` });
  } catch (err) {
    log.error('[transcriptHandler] Failed to generate transcript:', err.message);
    return null;
  }
}

export async function postTranscript(client, config, ticket, channel, attachment) {
  if (!attachment) return;
  try {
    const transcriptChannel = await client.channels.fetch(config.channels.transcripts);
    const embed = {
      color: 0x4F545C,
      title: '📄  Ticket Transcript',
      fields: [
        { name: '👤  Owner',   value: `<@${ticket.user_id}>`, inline: true },
        { name: '📋  Channel', value: `#${channel.name}`,     inline: true },
        { name: '📝  Reason',  value: ticket.closed_reason ?? 'N/A', inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
    await transcriptChannel.send({ embeds: [embed], files: [attachment] });
  } catch (err) {
    log.warn('[transcriptHandler] Failed to post transcript to channel:', err.message);
  }
}
