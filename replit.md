# Overview

This is a Discord bot application designed to manage stream status by integrating Discord interactions with GitHub file storage. The bot monitors Discord messages and updates a status override file (`override.json`) stored in a GitHub repository. This architecture allows external applications to read the current stream status from the GitHub-hosted JSON file.

# Recent Changes

## November 25, 2025 - Security Improvements & Feature Additions
- Removed hardcoded Discord and GitHub tokens from `bot.js`
- Migrated tokens to Replit Secrets for secure storage
- Updated code to use `process.env.DISCORD_TOKEN` and `process.env.GITHUB_TOKEN`
- Removed unused `index.js` file
- Added `readOverride()` function to fetch current status from GitHub
- Added `getStatusText()` function for emoji-formatted status messages (🚨 canceled, ⚠️ unlikely, ✅ normal)
- Enhanced `!stream status` command to show actual current status instead of just a link
- Changed JSON structure from `{ status }` to `{ override }` for better clarity

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Application Structure
- **Single Bot Instance**: The application runs as a standalone Discord bot client with no separate frontend or backend layers
- **Event-Driven Design**: Uses Discord.js event handlers to respond to Discord server events
- **Stateless Operation**: The bot doesn't maintain local state; all status information is persisted to GitHub

## Discord Integration
- **Library**: Discord.js v14.11.0
- **Gateway Intents**: Configured with `GuildMessages`, `MessageContent`, and `Guilds` to receive message events from Discord servers
- **Authentication**: Uses a Discord bot token stored in environment variables (`DISCORD_TOKEN`)

## Data Persistence Strategy
- **Storage Solution**: GitHub repository as a data store (no traditional database)
- **File-Based Storage**: Status information stored in `override.json` file
- **Update Mechanism**: Direct GitHub API calls to modify repository contents
- **Rationale**: This approach provides version-controlled, publicly accessible status data without requiring a dedicated database server or hosting infrastructure

## GitHub API Integration
- **Update Workflow**: 
  1. Fetch existing file to retrieve current SHA (required by GitHub API)
  2. Create base64-encoded content with new status
  3. Commit updated file via PUT request
- **Authentication**: Uses personal access token or GitHub token stored in environment variables (`GITHUB_TOKEN`)
- **Target Repository**: Currently configured for `lukage86/dianastreamstatus`

## Security Approach
- **Environment Variables**: All sensitive tokens (Discord, GitHub) stored in Replit Secrets
- **No Hardcoded Credentials**: All authentication tokens referenced through `process.env`

## Module System
- **ES Modules**: Uses `"type": "module"` in package.json for native ES6 import/export syntax
- **Dependencies**: Minimal dependency footprint with only `discord.js` and `node-fetch`

# External Dependencies

## Third-Party Services
- **Discord API**: Primary interface for bot interactions and message monitoring
- **GitHub API**: Used as a remote data store for status information at `https://api.github.com/repos/{owner}/{repo}/contents/{path}`

## NPM Packages
- **discord.js** (v14.11.0): Official Discord API wrapper for Node.js, handles WebSocket connections and event management
- **node-fetch** (v3.3.1): HTTP client for making GitHub API requests (provides browser-like `fetch` API in Node.js)

## Environment Configuration
Required environment variables:
- `DISCORD_TOKEN`: Bot authentication token from Discord Developer Portal
- `GITHUB_TOKEN`: Personal access token or GitHub app token with repository write permissions

## External Data Flow
1. Discord users trigger bot through messages
2. Bot processes events and updates status
3. GitHub repository file updated via API
4. External applications can read status from public GitHub raw file URL