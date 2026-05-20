import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminEditTask(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const task   = config.task ?? {};

  const modal = new ModalBuilder()
    .setCustomId('admin_save_task')
    .setTitle('Edit Task Template');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage1_minutes')
        .setLabel('Stage 1 timer (min) — TikTok deadline')
        .setStyle(TextInputStyle.Short)
        .setValue(String(task.stage1_timer_minutes ?? 60))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage2_days')
        .setLabel('Stage 2 timer (days) — Drive deadline')
        .setStyle(TextInputStyle.Short)
        .setValue(String(task.stage2_timer_days ?? 6))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('instructions')
        .setLabel('Task instructions ({user}, {stage1_minutes})')
        .setStyle(TextInputStyle.Paragraph)
        .setValue((task.instructions ?? '').slice(0, 4000))
        .setMaxLength(4000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage2_message')
        .setLabel('Stage 2 message (after TikTok link)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue((task.stage2_message ?? '').slice(0, 4000))
        .setMaxLength(4000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('completed_message')
        .setLabel('Completion message (after Drive link)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue((task.completed_message ?? '').slice(0, 4000))
        .setMaxLength(4000)
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}
