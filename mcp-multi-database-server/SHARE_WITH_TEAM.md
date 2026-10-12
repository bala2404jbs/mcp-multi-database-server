# How to Share Installation Scripts with Your Team

## Option 1: Make GitHub Repo Public (Easiest)

1. Go to: https://github.com/bala2404jbs/mcp-multi-database-server/settings
2. Scroll to the bottom "Danger Zone"
3. Click "Change visibility" → "Make public"

Then your team can use:

```bash
# Linux/macOS
curl -o install.sh https://raw.githubusercontent.com/bala2404jbs/mcp-multi-database-server/main/install.sh
chmod +x install.sh
./install.sh
```

```powershell
# Windows
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/bala2404jbs/mcp-multi-database-server/main/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

## Option 2: Share via Git Clone (Works with Private Repo)

Your team clones the repository (requires GitHub access):

```bash
git clone https://github.com/bala2404jbs/mcp-multi-database-server.git
cd mcp-multi-database-server
```

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**Windows:**
```powershell
.\install.ps1
```

## Option 3: Share Files Directly

Zip the installation files and share via email/Slack:

```bash
cd /home/balasubramanianj/Documents/Upscaling/db_mcp/mcp-multi-database-server
zip team-install.zip install.sh install.ps1 QUICK_INSTALL.md INSTALL.md
```

Send `team-install.zip` to your team. They extract and run the appropriate script.

## Option 4: Local Network Share

If on the same network, share the directory:

```bash
# Linux - using python http server
cd /home/balasubramanianj/Documents/Upscaling/db_mcp/mcp-multi-database-server
python3 -m http.server 8000
```

Team downloads from: `http://your-ip:8000/install.sh`

## Recommended Approach

**For external teams:** Option 1 (make repo public)
**For company/internal teams:** Option 2 (git clone with access)
**For quick testing:** Option 3 (direct file share)

## What to Send Your Team

### If Public Repo:

```
Hi Team,

Install the MCP Multi-Database Server with this one command:

Linux/macOS:
bash <(curl -s https://raw.githubusercontent.com/bala2404jbs/mcp-multi-database-server/main/install.sh)

Windows (PowerShell):
Invoke-WebRequest https://raw.githubusercontent.com/bala2404jbs/mcp-multi-database-server/main/install.ps1 | Invoke-Expression

Prerequisites:
- Node.js 18+
- GitHub Personal Access Token (read:packages)
- Database credentials

The script will guide you through setup.
```

### If Private Repo:

```
Hi Team,

Install the MCP Multi-Database Server:

1. Clone the repo:
   git clone https://github.com/bala2404jbs/mcp-multi-database-server.git
   cd mcp-multi-database-server

2. Run the installer:
   Linux/macOS: ./install.sh
   Windows: .\install.ps1

Prerequisites:
- Node.js 18+
- GitHub Personal Access Token (read:packages) 
- Database credentials

The script will guide you through setup.
```

## Current Status

Your repository: https://github.com/bala2404jbs/mcp-multi-database-server
Status: Private (raw URLs won't work)

To enable curl-based installation, make the repository public.
