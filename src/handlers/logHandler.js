import { buildLogEmbed } from '../utils/embeds.js';
import { insertEvent } from '../db/database.js';
import { log } from '../utils/logger.js';

let _client = null;
let _config = null;

export function initLogHandler(client, config) {
  _client = client;
  _config = config;
}

export async function logEvent(eventType, fields = {}, meta = {}) {
  const { channelId, actorId, metadata } = meta;

  if (channelId) {
    insertEvent({ channelId, eventType, actorId: actorId ?? null, metadata });
  }

  if (!_client || !_config?.channels?.log) return;

  try {
    const logChannel = await _client.channels.fetch(_config.channels.log);
    const embed = buildLogEmbed(eventType, fields);
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    log.warn(`[logHandler] Failed to post log for "${eventType}":`, err.message);
  }
}
