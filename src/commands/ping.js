import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Health check — shows bot latency'),

  async execute(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({
      content: `🏓 Pong! Latency: **${latency}ms** · API: **${interaction.client.ws.ping}ms**`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
