import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  return JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
}

export function renderString(templateStr, variables = {}) {
  return templateStr.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export function render(templateKey, variables = {}) {
  const config = loadConfig();
  const templateStr = config.dm_templates[templateKey];
  if (!templateStr) throw new Error(`Unknown DM template: ${templateKey}`);
  return renderString(templateStr, variables);
}

export function buildVars(opts = {}) {
  const config = loadConfig();
  return {
    intake_form_url:            config.intake_form_url,
    initial_inactivity_minutes: config.timers.initial_inactivity_minutes,
    ...opts,
  };
}
