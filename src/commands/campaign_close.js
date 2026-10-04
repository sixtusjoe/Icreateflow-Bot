import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { closeCampaignTicket } from '../buttons/campaign_close_ticket.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this campaign ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const config = loadCampaignConfig();

    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    const ticket = getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: '❌ This channel is not a campaign ticket.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();
    await closeCampaignTicket(interaction, { deferred: true });
  },
};
