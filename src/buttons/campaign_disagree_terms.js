import { EmbedBuilder } from 'discord.js';
import { updateTicket } from '../db/database.js';
import { log } from '../utils/logger.js';

export default async function campaignDisagreeTerms(interaction) {
  await interaction.deferUpdate();

  const channel = interaction.channel;
  const user    = interaction.user;

  const closedEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('❌ Terms Declined')
    .setDescription('You must agree to the terms to participate. This ticket will close in 10 seconds.');

  await interaction.editReply({ embeds: [closedEmbed], components: [] });
  await channel.send({ content: `<@${user.id}> — ticket closing…` });

  updateTicket(channel.id, { status: 'closed' });
  log.info(`[campaign] ${user.tag} disagreed with terms — closing ticket ${channel.id}`);

  setTimeout(async () => {
    await channel.delete().catch(() => {});
  }, 10_000);
}
