import { PermissionFlagsBits } from 'discord.js';
import { reloadTriggers } from '../handlers/triggerHandler.js';
import { log } from '../utils/logger.js';

export default async function adminReload(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
  }

  const triggers = reloadTriggers();
  log.info(`[admin] Config reloaded by ${interaction.user.tag}`);
  await interaction.reply({ content: `✅ Config reloaded — **${triggers.length}** trigger(s) active.`, ephemeral: true });
}
