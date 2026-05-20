import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminSelectTaskUser(interaction) {
  const selected = interaction.values[0]; // userId or 'all'
  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));

  const modal = new ModalBuilder()
    .setCustomId(`admin_task_modal|${selected}`)
    .setTitle(selected === 'all' ? 'Task → All In-Task Tickets' : `Task → @${interaction.component.options?.find(o => o.value === selected)?.label?.replace(/^@/, '') ?? selected}`);

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
        .setValue(config.task?.instructions ?? '')
        .setMaxLength(2000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stage2_message')
        .setLabel('Stage 2 message (after TikTok link)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.task?.stage2_message ?? '')
        .setMaxLength(1000)
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}
