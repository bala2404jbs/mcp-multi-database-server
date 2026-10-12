# Team Installation Guide

Install the private MCP package from GitHub Packages:

```text
@bala2404jbs/mcp-multi-database-server
```

## 1. Prerequisites

- Node.js 18 or newer
- npm
- GitHub Personal Access Token with `read:packages` permission
- Database credentials from your team lead or DBA

Check Node and npm:

```bash
node -v
npm -v
```

## 2. Configure npm for GitHub Packages

Replace `YOUR_GITHUB_PAT` with your GitHub token.

```bash
npm config set @bala2404jbs:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_PAT
```

Verify the registry mapping:

```bash
npm config get @bala2404jbs:registry
```

Expected output:

```text
https://npm.pkg.github.com
```

## 3. Install the MCP Server

```bash
npm install -g @bala2404jbs/mcp-multi-database-server
```

Verify installation:

```bash
npm list -g @bala2404jbs/mcp-multi-database-server --depth=0
which mcp-multi-database-server
```

On Windows PowerShell, use:

```powershell
npm list -g @bala2404jbs/mcp-multi-database-server --depth=0
where.exe mcp-multi-database-server
```

## 4. Create Local Config Files

Linux/macOS:

```bash
mkdir -p ~/.mcp-database
cd ~/.mcp-database

PACKAGE_PATH="$(npm root -g)/@bala2404jbs/mcp-multi-database-server"
cp "$PACKAGE_PATH/databases.json.example" databases.json
cp "$PACKAGE_PATH/users.json.example" users.json
chmod 600 databases.json users.json
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.mcp-database"
Set-Location "$env:USERPROFILE\.mcp-database"

$PackagePath = "$(npm root -g)\@bala2404jbs\mcp-multi-database-server"
Copy-Item "$PackagePath\databases.json.example" databases.json
Copy-Item "$PackagePath\users.json.example" users.json
```

Edit `databases.json` and add your database credentials.

Minimum example:

```json
[
  {
    "name": "prod_postgres",
    "type": "postgres",
    "host": "your-db-host.company.com",
    "port": 5432,
    "database": "production_db",
    "username": "your_username",
    "password": "your_password",
    "readOnly": true,
    "ssl": true,
    "maxPoolSize": 5,
    "queryTimeoutMs": 30000
  }
]
```

## 5. Configure Cursor MCP

Open Cursor MCP settings and add this server.

Linux:

```json
{
  "mcpServers": {
    "multi-database": {
      "command": "mcp-multi-database-server",
      "env": {
        "DATABASE_CONFIG_PATH": "/home/YOUR_USERNAME/.mcp-database/databases.json",
        "USERS_CONFIG_PATH": "/home/YOUR_USERNAME/.mcp-database/users.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

macOS:

```json
{
  "mcpServers": {
    "multi-database": {
      "command": "mcp-multi-database-server",
      "env": {
        "DATABASE_CONFIG_PATH": "/Users/YOUR_USERNAME/.mcp-database/databases.json",
        "USERS_CONFIG_PATH": "/Users/YOUR_USERNAME/.mcp-database/users.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Windows:

```json
{
  "mcpServers": {
    "multi-database": {
      "command": "mcp-multi-database-server",
      "env": {
        "DATABASE_CONFIG_PATH": "C:\\Users\\YOUR_USERNAME\\.mcp-database\\databases.json",
        "USERS_CONFIG_PATH": "C:\\Users\\YOUR_USERNAME\\.mcp-database\\users.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Restart Cursor after saving the MCP config.

## 6. Test in Cursor

Ask Cursor:

```text
Show me all available databases
```

Then test a database:

```text
Test connection to prod_postgres
```

## 7. Update Later

```bash
npm update -g @bala2404jbs/mcp-multi-database-server
```

Restart Cursor after updating.

## 8. Uninstall

```bash
npm uninstall -g @bala2404jbs/mcp-multi-database-server
```
