import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../config.json');

export default async function adminSaveTask(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const stage1Mins      = parseInt(interaction.fields.getTextInputValue('stage1_minutes').trim());
  const stage2Days      = parseInt(interaction.fields.getTextInputValue('stage2_days').trim());
  const instructions    = interaction.fields.getTextInputValue('instructions');
  const stage2Message   = interaction.fields.getTextInputValue('stage2_message');
  const completedMsg    = interaction.fields.getTextInputValue('completed_message');

  if (isNaN(stage1Mins) || isNaN(stage2Days)) {
    return interaction.reply({ content: '❌ Stage 1 minutes and Stage 2 days must be numbers.', flags: MessageFlags.Ephemeral });
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

  config.task = {
    ...config.task,
    stage1_timer_minutes: stage1Mins,
    stage2_timer_days:    stage2Days,
    instructions,
    stage2_message:       stage2Message,
    completed_message:    completedMsg,
  };

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

  log.info(`[admin] Task template updated by ${interaction.user.tag}`);
  await interaction.reply({
    content: `✅ Task template saved.\n• Stage 1 timer: **${stage1Mins} min**\n• Stage 2 timer: **${stage2Days} days**\n\nNext task you send will use these instructions.`,
    flags: MessageFlags.Ephemeral,
  });
}
