# Icreateflow Discord Ticket Bot

A production-grade Discord ticket management bot built for the Icreateflow server. Handles the full creator application lifecycle — from opening a ticket to assigning the Creator role — with inactivity timers, staff review threads, mention triggers, automated DMs, transcripts, and full logging.

---

## Features

- **Category-based ticket stages** — Open → Review → Approved / Denied → Closed
- **Private staff review thread** — Accept/Deny/Retry buttons visible only to staff inside a locked `🔒 Staff Review` thread
- **Inactivity timers** — Tickets auto-close after configurable inactivity; warning DM sent before closure
- **Mention triggers** — When users or staff tag a role, the bot fires configurable actions (reply, move, ping, DM)
- **Automated DMs** — Fully templated DMs at every stage
- **Creator role assignment** — Automatically assigned on approval with channel access
- **Transcript posting** — Full HTML transcript uploaded to a log channel on close
- **Hot-reload config** — Update triggers and timers without restarting
- **Admin panel** — `/admin` UI to edit timers, form URL, and welcome message live

---

## Requirements

- Node.js 20+
- PM2: `npm install -g pm2`
- Discord bot with these Portal settings enabled:
  - **Server Members Intent**
  - **Message Content Intent**
  - Bot must have **Administrator** permission in your server

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/sixtusjoe/Icreateflow-Bot.git
cd Icreateflow-Bot
npm install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Fill in:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id
```

| Variable | Where to find it |
|----------|-----------------|
| `DISCORD_TOKEN` | Developer Portal → Your App → Bot → Reset Token |
| `CLIENT_ID` | Developer Portal → Your App → General Information → Application ID |
| `GUILD_ID` | Discord → Right-click server → Copy Server ID (requires Developer Mode) |

### 3. Configure `config.json`

| Field | Where to find it |
|-------|-----------------|
| `categories.open/task/approved` | Right-click a category → Copy Category ID |
| `roles.staff/senior/creator` | Server Settings → Roles → right-click → Copy Role ID |
| `channels.panel/log/transcripts` | Right-click a channel → Copy Channel ID |
| `intake_form_url` | Your Google Form share link |

**Timer fields:**

| Field | Default | Description |
|-------|---------|-------------|
| `initial_inactivity_minutes` | 180 | Minutes before an open ticket auto-closes |
| `warning_minutes` | 30 | Minutes before close to send a warning DM |
| `closed_hard_delete_hours` | 24 | Hours before a closed ticket channel is deleted |
| `denied_hard_delete_seconds` | 30 | Seconds before a denied ticket channel is deleted |

### 4. Deploy slash commands

```bash
node src/deploy-commands.js
```

Run this once, and again any time you add new commands.

### 5. Start the bot

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed instruction to auto-start on reboot
```

---

## VPS Deployment (Production)

The bot runs on a VPS at `187.124.231.108` managed with PM2.

### Deploy / push updates from your Mac

```bash
rsync -avz --progress \
  -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'node_modules' \
  --exclude 'data/*.db' \
  --exclude '.env' \
  "/Users/mac/Icreateflow App/discord-ticket-bot/" \
  root@187.124.231.108:/root/icreateflow-bot/

ssh -i ~/.ssh/id_ed25519 root@187.124.231.108 \
  "cd /root/icreateflow-bot && pm2 restart discord-ticket-bot"
```

### VPS PM2 commands

```bash
ssh -i ~/.ssh/id_ed25519 root@187.124.231.108

pm2 status                          # see all running processes
pm2 logs discord-ticket-bot         # live logs
pm2 restart discord-ticket-bot      # restart bot
pm2 stop discord-ticket-bot         # stop bot
```

### Files that live only on the VPS (never in git)

| File/Folder | Why |
|-------------|-----|
| `.env` | Contains your bot token — never commit |
| `data/bot.db` | Live database — back up manually |
| `transcripts/` | Generated transcript files |
| `logs/` | PM2 log output |

---

## Migrating from Another Bot

If you have existing ticket channels created by a previous bot (e.g. Ticket Tool), run the one-time migration script **while the bot is stopped**:

```bash
node src/scripts/migrate.js
```

This will:
- Scan all channels in the open, task, and approved categories
- Rename each channel to just the owner's username
- Register each channel in the database so the bot can manage it
- Set inactivity timers on all open tickets

Then start the bot normally and it takes over immediately.

---

## Bot Permissions

Grant the bot **Administrator** in Server Settings → Roles. This is required for managing channel overwrites across all ticket stages.

**OAuth2 invite URL** (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

---

## Commands

### Staff Commands (requires Staff role or Manage Channels)

| Command | Description |
|---------|-------------|
| `/close [reason]` | Close the current ticket, post transcript, DM user |
| `/move <stage>` | Move ticket to Open / Review / Approved / Denied / Closed |
| `/userinfo` | View the ticket owner's profile and roles (ephemeral) |
| `/assign-role <role>` | Add a role to the ticket owner |
| `/remove-role <role>` | Remove a role from the ticket owner |

### Admin Commands (requires Administrator)

| Command | Description |
|---------|-------------|
| `/admin` | Open the live config editor — timers, form URL, welcome message |
| `/panel` | Post the ticket open panel to the current channel |
| `/triggers list` | List all loaded mention triggers |
| `/triggers reload` | Reload triggers from config.json without restarting |
| `/config get` | View current config summary |

### General

| Command | Description |
|---------|-------------|
| `/ping` | Health check / latency |

---

## Ticket Flow

```
[User clicks Open Ticket]
        ↓
  ┌── Open Category ────────────┐
  │  • Welcome embed (templated)│  ← Inactivity timer starts
  │  • Intake form link         │  ← Any user message cancels timer
  │  • Tag @Staff when ready    │  ← Trigger fires → moves to Review
  └─────────────────────────────┘
        ↓
  ┌── Review Category ──────────────────────────────────┐
  │  User sees their ticket normally                     │
  │  🔒 Staff Review thread (private, staff only):       │
  │    • Accept   → Approved + Creator role + DM        │
  │    • Deny     → Denied + DM + scheduled delete      │
  │    • Retry    → Back to Open + DM + fresh timer     │
  └─────────────────────────────────────────────────────┘
        ↓ (Accept)
  ┌── Approved Category ────────┐
  │  • Creator role assigned    │
  │  • Channel renamed ✅-name  │
  │  • Congratulations embed    │
  │  • DM sent                  │
  └─────────────────────────────┘
        ↓ (/close)
  ┌── Closed ───────────────────┐
  │  • HTML transcript posted   │
  │  • DM to owner              │
  │  • Channel deleted (timer)  │
  └─────────────────────────────┘
```

---

## Mention Triggers

Defined in `config.json` under `mention_triggers`. When a user or staff tags a configured role inside a ticket, the bot fires a chain of actions.

**Built-in triggers:**

| Trigger | Who | What fires |
|---------|-----|------------|
| `form_complete` | Ticket owner tags @Staff | Bot confirms, moves ticket to Review |
| `escalate_to_senior` | Staff tags @Senior in a Review ticket | Bot pings senior staff |

**Supported action types:** `reply`, `ping_role`, `ping_user`, `dm_user`, `move_ticket`, `stop_inactivity_timer`, `reset_inactivity_timer`, `add_role`, `remove_role`, `close_ticket`

**Reload triggers without restart:**
```
/triggers reload
```

---

## Admin Config Panel

Run `/admin` to open a UI that lets you update live without touching config.json or restarting:

| Field | Description |
|-------|-------------|
| Inactivity minutes | Auto-close timer for open tickets |
| Warning minutes | When to send the pre-close warning DM |
| Intake form URL | Google Form link shown in the welcome embed |
| Max retries | How many times a user can retry before final denial |
| Welcome message | Text shown when a ticket opens. Supports: `{user}`, `{initial_inactivity_minutes}`, `{intake_form_url}` |

---

## Important Notes

- **Single instance only.** Never run two instances against the same guild — timers will double-fire.
- **Back up `data/bot.db` regularly.** It holds all ticket records, events, and cooldowns.
- **Timer and trigger config** can be hot-reloaded via `/admin` and `/triggers reload`. No restart needed.
- **Do not commit `.env`.** It contains your live bot token.

---

## File Structure

```
src/
├── index.js                  # Entry point, event loader
├── deploy-commands.js        # One-shot command registration
├── commands/                 # Slash commands
├── events/                   # Discord gateway event handlers
├── handlers/
│   ├── ticketHandler.js      # moveTicket, closeTicket, approval flow
│   ├── timerHandler.js       # Inactivity timer loop
│   ├── triggerHandler.js     # Mention trigger evaluation
│   ├── dmHandler.js          # DM sending with template support
│   ├── logHandler.js         # Log channel posting
│   └── transcriptHandler.js  # HTML transcript generation
├── buttons/                  # Button interaction handlers
├── modals/                   # Modal submit handlers
├── db/
│   ├── database.js           # SQLite connection + query helpers
│   └── schema.sql            # Table definitions
├── scripts/
│   └── migrate.js            # One-time migration from another bot
└── utils/
    ├── embeds.js             # Central embed factory (design system)
    ├── templates.js          # DM template renderer + variable builder
    ├── permissions.js        # Permission overwrite builders
    ├── logger.js             # PM2-friendly timestamped logger
    └── mentions.js           # Mention parsing helpers
```
