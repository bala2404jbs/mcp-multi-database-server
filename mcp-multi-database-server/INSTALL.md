# MCP Multi-Database Server - Installation Guide

## Prerequisites

- Node.js 18 or newer
- npm
- Database credentials

Check your Node.js version:
```bash
node --version
```

## Installation Steps

### 1. Clone the Repository

```bash
cd ~/Documents
git clone <repository-url> mcp-database-server
cd mcp-database-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

Verify the build completed:
```bash
ls dist/index.js
```

You should see: `dist/index.js`

### 4. Create Database Configuration

Copy the example configuration:
```bash
cp databases.json.example databases.json
```

Edit `databases.json` with your database credentials:
```bash
nano databases.json
```

Example configuration:
```json
[
  {
    "name": "my_database",
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "your_username",
    "password": "your_password",
    "readOnly": true,
    "ssl": false,
    "maxPoolSize": 5,
    "queryTimeoutMs": 30000
  }
]
```

Save and exit (Ctrl+X, then Y, then Enter).

### 5. Configure Cursor

Get the full path to your installation:
```bash
pwd
```

Copy the output (example: `/home/username/Documents/mcp-database-server`)

Open Cursor settings file:
- **Linux**: `~/.cursor/config.json`
- **Mac**: `~/.cursor/config.json`
- **Windows**: `C:\Users\YourName\.cursor\config.json`

If the file doesn't exist, create it with this content:
```json
{
  "mcpServers": {}
}
```

Add the MCP server configuration:
```json
{
  "mcpServers": {
    "multi-database": {
      "command": "node",
      "args": [
        "/home/username/Documents/mcp-database-server/dist/index.js"
      ],
      "env": {
        "DATABASE_CONFIG_PATH": "/home/username/Documents/mcp-database-server/databases.json"
      }
    }
  }
}
```

**IMPORTANT**: Replace `/home/username/Documents/mcp-database-server` with the actual path from the `pwd` command.

### 6. Restart Cursor

Close Cursor completely and reopen it.

### 7. Test the Connection

In Cursor, type:
```
Show me all available databases
```

You should see your configured database(s) listed.

## Verification Checklist

Before contacting support, verify:

- [ ] Node.js 18+ is installed: `node --version`
- [ ] Dependencies installed: `ls node_modules` shows folders
- [ ] Project built successfully: `ls dist/index.js` shows the file
- [ ] databases.json exists: `ls databases.json` shows the file
- [ ] databases.json has valid JSON (no syntax errors)
- [ ] Cursor config uses absolute paths (not relative like `~/` or `./`)
- [ ] Cursor has been restarted after configuration

## Common Issues

### Issue: "MCP server not connecting"

**Check absolute paths:**
```bash
cd ~/Documents/mcp-database-server
echo "$(pwd)/dist/index.js"
echo "$(pwd)/databases.json"
```

Copy these exact paths into your Cursor config.

**Check Node.js:**
```bash
which node
node --version
```

Use the full path to node in Cursor config if needed:
```json
"command": "/usr/bin/node"
```

### Issue: "Database connection failed"

Test your database credentials outside of Cursor first:
```bash
# For PostgreSQL
psql -h localhost -U your_username -d mydb

# For MySQL
mysql -h localhost -u your_username -p mydb
```

### Issue: "Permission denied"

Check file permissions:
```bash
chmod 644 databases.json
chmod 755 dist/index.js
```

### Issue: "Module not found"

Rebuild the project:
```bash
npm run clean
npm install
npm run build
```

## Getting Help

1. Check Cursor Developer Tools:
   - Open: Help > Toggle Developer Tools
   - Look for errors in the Console tab

2. Check MCP server logs (if available)

3. Verify all paths are absolute (full paths starting with `/` on Linux/Mac or `C:\` on Windows)

4. Contact your team lead with:
   - Your Node.js version
   - The exact Cursor config you used
   - Any error messages from Developer Tools
