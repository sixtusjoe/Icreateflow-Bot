import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Files starting with "campaign_" go to the campaign guild only
const mainCommands     = [];
const campaignCommands = [];

const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const mod = await import(`./commands/${file}`);
  const cmd = mod.default ?? mod;
  if (!cmd?.data) continue;

  if (file.startsWith('campaign_')) {
    campaignCommands.push(cmd.data.toJSON());
  } else {
    mainCommands.push(cmd.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register main guild commands
try {
  console.log(`Registering ${mainCommands.length} command(s) to main guild ${process.env.GUILD_ID}…`);
  const data = await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: mainCommands }
  );
  console.log(`✅ Main guild: ${data.length} command(s) registered.`);
} catch (err) {
  console.error('❌ Failed to register main commands:', err.message);
}

// Register campaign guild commands (if CAMPAIGN_GUILD_ID is set)
if (process.env.CAMPAIGN_GUILD_ID && process.env.CAMPAIGN_GUILD_ID !== 'CAMPAIGN_GUILD_ID') {
  try {
    console.log(`Registering ${campaignCommands.length} command(s) to campaign guild ${process.env.CAMPAIGN_GUILD_ID}…`);
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.CAMPAIGN_GUILD_ID),
      { body: campaignCommands }
    );
    console.log(`✅ Campaign guild: ${data.length} command(s) registered.`);
  } catch (err) {
    console.error('❌ Failed to register campaign commands:', err.message);
  }
} else {
  console.log('⚠️  CAMPAIGN_GUILD_ID not set — skipping campaign command registration.');
}
