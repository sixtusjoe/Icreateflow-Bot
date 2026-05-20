import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminSelectTaskUser(interaction) {
  const selected = interaction.values[0]; // userId | 'status:in_task' | 'status:open'
  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));

  // Build a human-readable title for the modal
  const statusLabels = {
    'status:in_task': 'All In-Task Tickets',
    'status:open':    'All Open Tickets',
  };
  const label = selected.startsWith('status:')
    ? statusLabels[selected] ?? selected
    : interaction.component.options?.find(o => o.value === selected)?.label?.replace(/^@/, '') ?? selected;

  const modal = new ModalBuilder()
    .setCustomId(`admin_task_modal|${selected}`)
    .setTitle(`Task → ${label}`.slice(0, 45)); // Discord title cap

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage1_minutes')
        .setLabel('Stage 1 timer (min) — TikTok deadline')
        .setStyle(TextInputStyle.Short)
        .setValue(String(config.task?.stage1_timer_minutes ?? 60))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage2_days')
        .setLabel('Stage 2 timer (days) — Drive deadline')
        .setStyle(TextInputStyle.Short)
        .setValue(String(config.task?.stage2_timer_days ?? 6))
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('instructions')
        .setLabel('Task instructions ({user}, {stage1_minutes})')
        .setStyle(TextInputStyle.Paragraph)
        .setValue((config.task?.instructions ?? '').slice(0, 4000))
        .setMaxLength(4000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage2_message')
        .setLabel('Stage 2 message (after TikTok link)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue((config.task?.stage2_message ?? '').slice(0, 4000))
        .setMaxLength(4000)
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}
