import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getTicket } from '../db/database.js';
import { moveTicket } from '../handlers/ticketHandler.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move this ticket to a different stage (staff only)')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Target stage')
        .setRequired(true)
        .addChoices(
          { name: 'Open',     value: 'open'     },
          { name: 'Review',   value: 'task'     },
          { name: 'Approved', value: 'approved' },
          { name: 'Denied',   value: 'denied'   },
          { name: 'Closed',   value: 'closed'   }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const config      = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
    const ticket      = getTicket(interaction.channel.id);
    const destination = interaction.options.getString('category');

    if (!ticket) {
      return interaction.reply({ content: '❌ This channel is not a ticket.', ephemeral: true });
    }

    if (!isStaff(interaction.member, config)) {
      return interaction.reply({ content: '❌ Only staff can move tickets.', ephemeral: true });
    }

    await interaction.reply({ content: `➡️ Moving ticket to **${destination}**…`, ephemeral: true });
    await moveTicket(interaction.client, config, interaction.channel.id, destination, { actorId: interaction.user.id });
  },
};
