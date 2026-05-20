/**
 * One-time fix script.
 * For every in_task ticket:
 *   1. Deletes duplicate 🔒 Staff Review threads (keeps none — we recreate fresh)
 *   2. Deletes any bot messages in the main channel that contain the task action buttons
 *   3. Creates a single clean 🔒 Staff Review thread with the correct embed + buttons
 *   4. Adds all staff/senior members to it
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
const db = new Database(join(ROOT, 'data/bot.db'));

import { buildTaskActionEmbed, taskActionRow } from '../utils/embeds.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`\n✅ Logged in as ${client.user.tag}`);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.members.fetch();

  const tickets = db.prepare("SELECT * FROM tickets WHERE status = 'in_task'").all();
  console.log(`\nProcessing ${tickets.length} in_task tickets...\n`);

  for (const ticket of tickets) {
    try {
      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) { console.log(`⏩ Skip (deleted): ${ticket.channel_id}`); continue; }

      console.log(`\n🔧 Fixing #${channel.name}...`);

      // 1. Delete ALL existing Staff Review threads
      await channel.threads.fetchActive().catch(() => {});
      const staffThreads = channel.threads.cache.filter(t => t.name === '🔒 Staff Review');
      for (const [, thread] of staffThreads) {
        await thread.delete('Cleanup fix').catch(() => {});
        console.log(`  🗑️  Deleted thread: ${thread.id}`);
      }

      // 2. Delete any bot messages in the main channel that have the task action buttons
      const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (messages) {
        for (const [, msg] of messages) {
          if (msg.author.id === client.user.id && msg.components?.length > 0) {
            const hasTaskButton = msg.components.some(row =>
              row.components?.some(btn => btn.customId?.startsWith('accept_task') || btn.customId?.startsWith('deny_final') || btn.customId?.startsWith('deny_retry'))
            );
            if (hasTaskButton) {
              await msg.delete().catch(() => {});
              console.log(`  🗑️  Deleted leaked embed message`);
            }
          }
        }
      }

      // 3. Create a fresh Staff Review thread
      const embed = buildTaskActionEmbed(ticket, config, guild);
      let thread = null;
      try {
        thread = await channel.threads.create({
          name: '🔒 Staff Review',
          type: ChannelType.PrivateThread,
          invitable: false,
        });
        await thread.send({ embeds: [embed], components: [taskActionRow(ticket.channel_id)] });
        console.log(`  ✅ Created fresh Staff Review thread`);
      } catch (err) {
        console.log(`  ❌ Failed to create thread: ${err.message}`);
        continue;
      }

      // 4. Add staff members
      let added = 0;
      for (const [, member] of guild.members.cache) {
        if (member.roles.cache.has(config.roles.staff) || member.roles.cache.has(config.roles.senior)) {
          await thread.members.add(member.id).catch(() => {});
          added++;
        }
      }
      console.log(`  👥 Added ${added} staff members`);

    } catch (err) {
      console.log(`  ❌ Error on ${ticket.channel_id}: ${err.message}`);
    }
  }

  console.log('\n✅ Done');
  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
