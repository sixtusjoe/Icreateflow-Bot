import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { reloadTriggers, getTriggers } from '../handlers/triggerHandler.js';

export default {
  data: new SlashCommandBuilder()
    .setName('triggers')
    .setDescription('Manage mention triggers')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all currently loaded mention triggers')
    )
    .addSubcommand(sub =>
      sub.setName('reload').setDescription('Reload triggers from config.json without restarting')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'reload') {
      const triggers = reloadTriggers();
      return interaction.reply({
        content: `✅ Reloaded **${triggers.length}** trigger(s) from config.json.`,
        ephemeral: true,
      });
    }

    if (sub === 'list') {
      const triggers = getTriggers();
      if (triggers.length === 0) {
        return interaction.reply({ content: 'No triggers loaded.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xCCCC00)
        .setTitle(`🎯  Loaded Mention Triggers (${triggers.length})`)
        .setTimestamp();

      for (const t of triggers) {
        const matchDesc = t.match.type === 'role'
          ? `role <@&${t.match.id}>`
          : t.match.type === 'user'
          ? `user <@${t.match.id}>`
          : t.match.type;

        embed.addFields({
          name:  `\`${t.id}\` — ${t.name}`,
          value: `**Status:** ${t.active_in_status.join(', ')} · **Match:** ${matchDesc} · **Cooldown:** ${t.cooldown_seconds}s · **Actions:** ${t.actions.length}`,
          inline: false,
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
