import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    let campaignConfig;
    try {
      campaignConfig = loadCampaignConfig();
    } catch {
      return; // config.campaign.json not set up yet
    }

    if (member.guild.id !== campaignConfig.guild_id) return;

    // Check if user has 'creator' role on the main server
    const mainGuild = member.client.guilds.cache.get(campaignConfig.main_guild_id);
    if (!mainGuild) {
      log.warn('[guildMemberAdd] Main guild not in cache — bot may not be in that server');
      return;
    }

    const mainMember = await mainGuild.members.fetch(member.id).catch(() => null);
    if (!mainMember) return; // user not in main server

    if (mainMember.roles.cache.has(campaignConfig.main_creator_role_id)) {
      await member.roles.add(campaignConfig.roles.creator).catch(err =>
        log.warn(`[guildMemberAdd] Failed to assign creator role: ${err.message}`)
      );
      log.info(`[guildMemberAdd] Granted creator role to ${member.user.tag} on campaign server`);
    }
  },
};
