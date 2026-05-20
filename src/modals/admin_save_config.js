import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { reloadTriggers } from '../handlers/triggerHandler.js';
import { reloadTimerConfig } from '../handlers/timerHandler.js';
import { log } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../config.json');

export default async function adminSaveConfig(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const inactivity  = parseInt(interaction.fields.getTextInputValue('inactivity_minutes'));
  const warning     = parseInt(interaction.fields.getTextInputValue('warning_minutes'));
  const formUrl     = interaction.fields.getTextInputValue('intake_form_url').trim();
  const maxRetries  = parseInt(interaction.fields.getTextInputValue('max_retries'));
  const welcomeMsg  = interaction.fields.getTextInputValue('welcome_message');

  if ([inactivity, warning, maxRetries].some(isNaN)) {
    return interaction.reply({ content: '❌ Timer and retry fields must be numbers.', flags: MessageFlags.Ephemeral });
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  config.timers.initial_inactivity_minutes  = inactivity;
  config.timers.warning_minutes             = warning;
  config.intake_form_url                    = formUrl;
  config.max_retries                        = maxRetries;
  config.welcome_message                    = welcomeMsg;

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  reloadTriggers();
  reloadTimerConfig();

  log.info(`[admin] Config updated by ${interaction.user.tag}`);
  await interaction.reply({ content: '✅ Config saved and triggers reloaded.', flags: MessageFlags.Ephemeral });
}
