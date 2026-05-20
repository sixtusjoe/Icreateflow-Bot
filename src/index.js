import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './db/database.js';
import { log } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();

// Load commands
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const mod = await import(`./commands/${file}`);
  const command = mod.default ?? mod;
  if (!command?.data) continue;
  client.commands.set(command.data.name, command);
  log.info(`[index] Loaded command: ${command.data.name}`);
}

// Load events
const eventFiles = readdirSync(join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = (await import(`./events/${file}`)).default;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  log.info(`[index] Loaded event: ${event.name}`);
}

// Graceful shutdown
function shutdown(signal) {
  log.info(`[index] Received ${signal} — shutting down gracefully`);
  try { db.close(); } catch {}
  client.destroy();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  log.error('[index] Unhandled rejection:', reason);
});

await client.login(process.env.DISCORD_TOKEN);
