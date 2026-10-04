/**
 * One-time migration: move ticket channels to the correct category
 * based on their current task_stage.
 *
 *   awaiting_drive  → Interviewing category  + 🟠 icon
 *   drive_submitted → Under Review category  + 🔵 icon
 */

import { Client, GatewayIntentBits } from 'discord.js';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const config    = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
const db        = new Database(join(__dirname, '../../data/bot.db'));

const INTERVIEWING_ID  = config.categories.interviewing;
const UNDER_REVIEW_ID  = config.categories.under_review;

function stripIcon(name) {
  return name.replace(/^[🔴🟠🔵✅⚠️]+[-\s]*/u, '').replace(/^[-\s]+/, '');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const tickets = db.prepare(
    "SELECT * FROM tickets WHERE task_stage IN ('awaiting_drive', 'drive_submitted')"
  ).all();

  console.log(`Found ${tickets.length} ticket(s) to migrate.`);

  let moved = 0, skipped = 0, failed = 0;

  for (const ticket of tickets) {
    const { channel_id, task_stage } = ticket;
    const categoryId = task_stage === 'awaiting_drive' ? INTERVIEWING_ID : UNDER_REVIEW_ID;
    const icon       = task_stage === 'awaiting_drive' ? '🟠' : '🔵';
    const label      = task_stage === 'awaiting_drive' ? 'Interviewing' : 'Under Review';

    if (!categoryId) {
      console.log(`  SKIP ${channel_id} — ${label} category ID not set in config`);
      skipped++;
      continue;
    }

    try {
      const channel = await client.channels.fetch(channel_id).catch(() => null);
      if (!channel) {
        console.log(`  SKIP ${channel_id} — channel not found`);
        skipped++;
        continue;
      }

      // Skip if already in the right category
      if (channel.parentId === categoryId) {
        // Still fix icon if needed
        const cleanName = stripIcon(channel.name);
        const expected  = `${icon}-${cleanName}`;
        if (channel.name !== expected) {
          await channel.setName(expected).catch(() => {});
        }
        console.log(`  OK   #${channel.name} — already in ${label}`);
        moved++;
        continue;
      }

      // Move to correct category
      await channel.setParent(categoryId, { lockPermissions: false });

      // Fix icon
      const cleanName = stripIcon(channel.name);
      await channel.setName(`${icon}-${cleanName}`).catch(() => {});

      console.log(`  ✅  #${cleanName} → ${label} (${task_stage})`);
      moved++;
    } catch (err) {
      console.error(`  ❌  ${channel_id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone — moved: ${moved}, skipped: ${skipped}, failed: ${failed}`);
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
