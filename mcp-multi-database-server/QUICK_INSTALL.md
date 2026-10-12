# Quick Installation - Choose Your Platform

## Linux / macOS

Run the installation script:

```bash
curl -o install.sh https://raw.githubusercontent.com/bala2404jbs/mcp-multi-database-server/main/install.sh
chmod +x install.sh
./install.sh
```

Or if you have the files locally:

```bash
chmod +x install.sh
./install.sh
```

## Windows

Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\install.ps1
```

## What the Script Does

1. ✓ Checks Node.js and npm are installed
2. ✓ Prompts for your GitHub Personal Access Token
3. ✓ Configures npm for GitHub Packages
4. ✓ Installs the MCP server globally
5. ✓ Creates configuration directory (`~/.mcp-database`)
6. ✓ Prompts for your database credentials
7. ✓ Generates `databases.json` configuration
8. ✓ Sets up Cursor MCP configuration

## Prerequisites

Before running the script, make sure you have:

1. **Node.js 18+** installed
   - Download from: https://nodejs.org
   - Verify: `node --version`

2. **GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `read:packages`
   - Copy the token

3. **Database credentials** (host, port, username, password)

## After Installation

1. **Restart Cursor** (completely close and reopen)

2. **Test the connection** in Cursor:
   ```
   Show me all available databases
   ```

3. **If it works**, you'll see your database listed!

## Troubleshooting

### Script won't run (Linux/macOS)
```bash
chmod +x install.sh
bash install.sh
```

### Script won't run (Windows)
Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\install.ps1
```

### Package installation fails
- Verify your GitHub token is correct
- Make sure you have `read:packages` permission
- Check internet connection

### Cursor not connecting
- Verify Cursor config file exists:
  - Linux/Mac: `~/.cursor/config.json`
  - Windows: `%USERPROFILE%\.cursor\config.json`
- Check paths are absolute (full paths, not `~/`)
- Restart Cursor completely
- Check Developer Tools for errors (Help > Toggle Developer Tools)

### Database connection fails
- Test database connection outside Cursor first
- Verify host, port, username, password
- Check if VPN is required and connected
- Ensure firewall allows database connections

## Manual Installation

If the script doesn't work, follow the manual steps in `INSTALL.md`

## Support

For issues:
1. Check Cursor Developer Tools (Help > Toggle Developer Tools)
2. Review `~/.mcp-database/databases.json` for configuration errors
3. Verify package is installed: `npm list -g @bala2404jbs/mcp-multi-database-server`
4. Contact your team lead
