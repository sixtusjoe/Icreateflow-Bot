import { log } from '../utils/logger.js';
import { initTimerHandler, startLoop, startCleanupLoop } from '../handlers/timerHandler.js';
import { initLogHandler } from '../handlers/logHandler.js';
import { initTriggerHandler } from '../handlers/triggerHandler.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function validateConfig(config, guild) {
  const errors = [];

  for (const [key, id] of Object.entries(config.categories)) {
    if (id === null) continue; // null = no archive, intentional
    if (String(id).startsWith('CATEGORY_ID')) { errors.push(`categories.${key} is not configured`); continue; }
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch) errors.push(`categories.${key} = "${id}" not found`);
  }

  for (const [key, rawId] of Object.entries(config.roles)) {
    const ids = Array.isArray(rawId) ? rawId : [rawId];
    for (const id of ids) {
      if (!id || String(id).startsWith('ROLE_') || String(id).startsWith('STAFF_') || String(id).startsWith('SENIOR_')) {
        errors.push(`roles.${key} is not configured`); continue;
      }
      const role = guild.roles.cache.get(id);
      if (!role) errors.push(`roles.${key} = "${id}" not found`);
    }
  }

  for (const [key, id] of Object.entries(config.channels)) {
    if (id.startsWith('CHANNEL_ID')) { errors.push(`channels.${key} is not configured`); continue; }
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch) errors.push(`channels.${key} = "${id}" not found`);
  }

  return errors;
}

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    log.info(`Bot ready as ${client.user.tag}`);

    const configPath = join(__dirname, '../../config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    initLogHandler(client, config);
    initTimerHandler(client, config);
    initTriggerHandler(client, config);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
      log.error('Guild not found — check GUILD_ID in .env');
      return;
    }

    const errors = await validateConfig(config, guild);
    if (errors.length > 0) {
      log.warn('[ready] Config validation warnings:');
      errors.forEach(e => log.warn(`  • ${e}`));
    } else {
      log.info('[ready] Config validation passed');
    }

    startLoop();
    startCleanupLoop();
  },
};
