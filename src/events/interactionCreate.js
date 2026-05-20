import { log } from '../utils/logger.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const baseId = interaction.customId.split('|')[0].replace(/-/g, '_');
        try {
          const handler = await import(`../buttons/${baseId}.js`);
          await handler.default(interaction);
        } catch (err) {
          if (err.code === 'ERR_MODULE_NOT_FOUND') {
            log.warn(`[interactionCreate] No button handler for: ${interaction.customId}`);
          } else {
            throw err;
          }
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const baseId = interaction.customId.split('|')[0].replace(/-/g, '_');
        try {
          const handler = await import(`../modals/${baseId}.js`);
          await handler.default(interaction);
        } catch (err) {
          if (err.code === 'ERR_MODULE_NOT_FOUND') {
            log.warn(`[interactionCreate] No modal handler for: ${interaction.customId}`);
          } else {
            throw err;
          }
        }
        return;
      }
    } catch (err) {
      log.error('[interactionCreate] Unhandled error:', err.message, err.stack);
      const reply = { content: '❌ An internal error occurred. Please try again.', ephemeral: true };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch {}
    }
  },
};
