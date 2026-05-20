export function parseMentions(message) {
  return {
    roles:    [...message.mentions.roles.values()],
    users:    [...message.mentions.users.values()],
    everyone: message.mentions.everyone,
    here:     message.content.includes('@here'),
  };
}

export function matchesTrigger(mentions, triggerMatch) {
  const { type, id } = triggerMatch;
  if (type === 'everyone') return mentions.everyone;
  if (type === 'here')     return mentions.here;
  if (type === 'role')     return mentions.roles.some(r => r.id === id);
  if (type === 'user')     return mentions.users.some(u => u.id === id);
  return false;
}
