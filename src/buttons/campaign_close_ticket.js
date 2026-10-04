import { EmbedBuilder, MessageFlags } from 'discord.js';
import { updateTicket, getTicket } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

export async function closeCampaignTicket(interaction, { deferred = false } = {}) {
  const config  = loadCampaignConfig();
  const channel = interaction.channel;
  const closer  = interaction.user;
  const guild   = interaction.guild;

  const ticket = getTicket(channel.id);

  // Downgrade active_creator → creator for the ticket owner
  if (ticket?.user_id) {
    const owner = await guild.members.fetch(ticket.user_id).catch(() => null);
    if (owner) {
      if (owner.roles.cache.has(config.roles.active_creator)) {
        await owner.roles.remove(config.roles.active_creator).catch(err =>
          log.warn(`[campaign_close] Failed to remove active_creator: ${err.message}`)
        );
      }
      if (!owner.roles.cache.has(config.roles.creator)) {
        await owner.roles.add(config.roles.creator).catch(err =>
          log.warn(`[campaign_close] Failed to restore creator role: ${err.message}`)
        );
      }
    }
  }

  const closeEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🔒 Ticket Closed')
    .setDescription(`This ticket was closed by <@${closer.id}>.\n\nChannel will be deleted in **5 seconds**.`);

  await channel.send({ embeds: [closeEmbed] });

  updateTicket(channel.id, { status: 'closed' });
  log.info(`[campaign] Ticket ${channel.id} closed by ${closer.tag} — active_creator role removed`);

  setTimeout(async () => {
    await channel.delete().catch(() => {});
  }, 5_000);
}

export default async function campaignCloseTicket(interaction) {
  const config = loadCampaignConfig();
  const member = interaction.member;
  const closer = interaction.user;

  const isStaff = member.roles.cache.has(config.roles.staff) ||
                  member.permissions.has(0x8n);
  const ticket  = getTicket(interaction.channel.id);
  const isOwner = ticket?.user_id === closer.id;

  if (!isStaff && !isOwner) {
    return interaction.reply({
      content: '❌ Only staff can close this ticket.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferUpdate();
  await closeCampaignTicket(interaction);
}
