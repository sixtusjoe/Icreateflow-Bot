import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '../../config.json');

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View live config values (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('get').setDescription('Display current config summary')
    ),

  async execute(interaction) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    const lines = [
      `**Timer:** ${config.timers.initial_inactivity_minutes}m inactivity, ${config.timers.warning_minutes}m warning`,
      `**Max Retries:** ${config.max_retries}`,
      `**Triggers:** ${config.mention_triggers?.length ?? 0} loaded`,
      `**Categories:** ${Object.keys(config.categories).join(', ')}`,
      `**Intake Form:** ${config.intake_form_url}`,
    ];

    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
  },
};
