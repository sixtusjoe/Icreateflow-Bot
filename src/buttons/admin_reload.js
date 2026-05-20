import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { reloadTriggers } from '../handlers/triggerHandler.js';
import { log } from '../utils/logger.js';

export default async function adminReload(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const triggers = reloadTriggers();
  log.info(`[admin] Config reloaded by ${interaction.user.tag}`);
  await interaction.reply({ content: `✅ Config reloaded — **${triggers.length}** trigger(s) active.`, flags: MessageFlags.Ephemeral });
}
