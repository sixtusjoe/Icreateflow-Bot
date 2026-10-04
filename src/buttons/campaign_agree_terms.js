import { EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { updateTicket } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

export default async function campaignAgreeTerms(interaction) {
  const config   = loadCampaignConfig();
  const typeId   = interaction.customId.split('|')[1];
  const user     = interaction.user;
  const channel  = interaction.channel;
  const guild    = interaction.guild;

  await interaction.deferUpdate();

  // Assign active_creator role
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (member) {
    await member.roles.add(config.roles.active_creator).catch(err =>
      log.warn(`[campaign_agree_terms] Failed to assign role: ${err.message}`)
    );
  }

  // Unlock chat but keep threads blocked
  await channel.permissionOverwrites.edit(user.id, {
    [PermissionFlagsBits.SendMessages]:          true,
    [PermissionFlagsBits.CreatePublicThreads]:   false,
    [PermissionFlagsBits.CreatePrivateThreads]:  false,
    [PermissionFlagsBits.SendMessagesInThreads]: false,
  }).catch(err => log.warn(`[campaign_agree_terms] Failed to unlock chat: ${err.message}`));

  // Move channel to active creator category (fire-and-forget — may be rate-limited)
  if (config.categories.active_creator) {
    channel.setParent(config.categories.active_creator, { lockPermissions: false })
      .catch(err => log.warn(`[campaign_agree_terms] Category move failed: ${err.message}`));
  }

  // Update the terms message to show accepted state
  const acceptedEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✅ Terms Accepted')
    .setDescription(`<@${user.id}> has agreed to the VA terms.`);

  await interaction.editReply({ embeds: [acceptedEmbed], components: [] });

  // Update ticket status to in_task
  updateTicket(channel.id, { status: 'in_task' });

  // Send creator type confirmation + next steps
  const creatorType = config.creator_types.find(ct => ct.id === typeId);
  const typeLabel   = creatorType?.label ?? typeId.toUpperCase();

  const confirmEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`✅ Creator Type Selected: ${typeLabel}`)
    .setDescription(
      `Check <#1509841291641487420> to understand more about the campaign, then visit <#1509842666492395651> to start submitting your account variations.\n\n` +
      `✅ Role granted: <@&${config.roles.active_creator}>`
    );

  await channel.send({ content: `<@${user.id}>`, embeds: [confirmEmbed] });

  // Post to log channel
  const logChannel = await interaction.client.channels.fetch(config.channels.log).catch(() => null);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅ Creator Onboarded')
      .addFields(
        { name: 'User',         value: `<@${user.id}>`, inline: true },
        { name: 'Creator Type', value: typeLabel,        inline: true },
        { name: 'Channel',      value: `<#${channel.id}>`, inline: true },
      )
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }

  log.info(`[campaign] ${user.tag} agreed to terms (${typeLabel}) — role and chat unlocked`);
}
