import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const mod = await import(`./commands/${file}`);
  const cmd = mod.default ?? mod;
  if (cmd?.data) commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Registering ${commands.length} slash commands to guild ${process.env.GUILD_ID}…`);
  const data = await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log(`✅ Successfully registered ${data.length} command(s).`);
} catch (err) {
  console.error('❌ Failed to register commands:', err.message);
  process.exit(1);
}
