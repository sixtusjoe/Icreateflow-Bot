import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminEditConfig(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));

  const modal = new ModalBuilder()
    .setCustomId('admin_save_config')
    .setTitle('Edit Bot Config');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('inactivity_minutes')
        .setLabel('Inactivity timer (minutes)')
        .setStyle(TextInputStyle.Short)
        .setValue(String(config.timers.initial_inactivity_minutes))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('warning_minutes')
        .setLabel('Warning DM sent X minutes before close')
        .setStyle(TextInputStyle.Short)
        .setValue(String(config.timers.warning_minutes))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('intake_form_url')
        .setLabel('Intake form URL')
        .setStyle(TextInputStyle.Short)
        .setValue(config.intake_form_url ?? '')
        .setRequired(true)
        .setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('max_retries')
        .setLabel('Max retries allowed per ticket')
        .setStyle(TextInputStyle.Short)
        .setValue(String(config.max_retries))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('welcome_message')
        .setLabel('Welcome message (use {user}, {minutes})')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.welcome_message)
        .setRequired(true)
        .setMaxLength(1000)
    ),
  );

  await interaction.showModal(modal);
}
