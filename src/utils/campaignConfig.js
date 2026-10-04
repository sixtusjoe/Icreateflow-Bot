import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../config.campaign.json');

export function loadCampaignConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}
