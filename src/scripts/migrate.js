/**
 * One-time migration script.
 * - Scans open/task/approved categories for existing ticket channels
 * - Identifies the ticket owner from channel permission overwrites
 * - Renames each channel to just the owner's username
 * - Registers each channel in bot.db so the bot can manage them
 *
 * Run ONCE while the bot is stopped:
 *   node src/scripts/migrate.js
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, OverwriteType } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
const db = new Database(join(ROOT, 'data/bot.db'));
db.pragma('journal_mode = WAL');

const STATUS_BY_CATEGORY = {
  [config.categories.open]:     'open',
  [config.categories.task]:     'in_task',
  [config.categories.approved]: 'approved',
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  console.log(`\n✅ Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.members.fetch(); // cache all members

  const channels = await guild.channels.fetch();
  const botId = client.user.id;

  let registered = 0;
  let skipped = 0;
  let renamed = 0;
  let failed = 0;

  for (const [, channel] of channels) {
    if (!channel || channel.type !== 0 /* GuildText */) continue;

    const parentId = channel.parentId;
    if (!parentId || !STATUS_BY_CATEGORY[parentId]) continue;

    const status = STATUS_BY_CATEGORY[parentId];

    // Find the ticket owner — a member-type overwrite that isn't the bot
    const memberOverwrite = channel.permissionOverwrites.cache.find(
      ow => ow.type === OverwriteType.Member && ow.id !== botId
    );

    if (!memberOverwrite) {
      console.log(`⚠️  Skipping #${channel.name} — no member overwrite found`);
      skipped++;
      continue;
    }

    const ownerId = memberOverwrite.id;
    let user = guild.members.cache.get(ownerId)?.user ?? null;
    if (!user) {
      try { user = await client.users.fetch(ownerId); } catch {}
    }
    const username = user
      ? user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || `user-${ownerId.slice(-4)}`
      : `user-${ownerId.slice(-4)}`;

    // Rename channel
    if (channel.name !== username) {
      try {
        await channel.setName(username);
        console.log(`✏️  Renamed #${channel.name} → #${username}`);
        renamed++;
      } catch (err) {
        console.log(`❌ Failed to rename #${channel.name}: ${err.message}`);
        failed++;
      }
    }

    // Register in DB if not already there
    const existing = db.prepare('SELECT channel_id FROM tickets WHERE channel_id = ?').get(channel.id);
    if (existing) {
      console.log(`⏩ Already registered: #${username}`);
      skipped++;
      continue;
    }

    const now = Date.now();
    const timerExpiresAt = status === 'open'
      ? now + config.timers.initial_inactivity_minutes * 60 * 1000
      : null;

    db.prepare(`
      INSERT INTO tickets
        (channel_id, user_id, guild_id, status, current_category_id, created_at, last_activity_at, timer_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(channel.id, ownerId, guild.id, status, parentId, now, now, timerExpiresAt);

    console.log(`✅ Registered #${username} — status: ${status}${timerExpiresAt ? ` (timer: ${config.timers.initial_inactivity_minutes}min)` : ''}`);
    registered++;
  }

  console.log(`\n📊 Done — registered: ${registered}, renamed: ${renamed}, skipped: ${skipped}, failed: ${failed}`);
  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
