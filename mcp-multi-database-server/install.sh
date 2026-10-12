#!/bin/bash

# MCP Multi-Database Server - Installation Script
# For Linux and macOS

set -e

echo "========================================="
echo "MCP Multi-Database Server - Team Setup"
echo "========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js 18 or newer from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js version must be 18 or newer. Current: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi

echo "✓ npm $(npm -v) detected"
echo ""

# Prompt for GitHub token
echo "Step 1: GitHub Authentication"
echo "------------------------------"
echo "You need a GitHub Personal Access Token with 'read:packages' permission."
echo "Get one at: https://github.com/settings/tokens"
echo ""
read -sp "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GitHub token is required."
    exit 1
fi

# Configure npm
echo ""
echo "Step 2: Configuring npm..."
echo "------------------------------"
npm config set @bala2404jbs:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
echo "✓ npm configured for GitHub Packages"
echo ""

# Install package
echo "Step 3: Installing package..."
echo "------------------------------"
npm install -g @bala2404jbs/mcp-multi-database-server

if [ $? -ne 0 ]; then
    echo "ERROR: Package installation failed."
    echo "Please check your GitHub token and try again."
    exit 1
fi

echo "✓ Package installed successfully"
echo ""

# Verify installation
PACKAGE_PATH=$(npm root -g)/@bala2404jbs/mcp-multi-database-server
if [ ! -d "$PACKAGE_PATH" ]; then
    echo "ERROR: Package not found after installation."
    exit 1
fi

echo "✓ Package verified at: $PACKAGE_PATH"
echo ""

# Create config directory
CONFIG_DIR="$HOME/.mcp-database"
echo "Step 4: Creating configuration directory..."
echo "------------------------------"
mkdir -p "$CONFIG_DIR"
echo "✓ Created: $CONFIG_DIR"
echo ""

# Copy example files
echo "Step 5: Setting up configuration files..."
echo "------------------------------"
cp "$PACKAGE_PATH/databases.json.example" "$CONFIG_DIR/databases.json"
echo "✓ Created: $CONFIG_DIR/databases.json"
echo ""

# Prompt for database configuration
echo "Step 6: Database Configuration"
echo "------------------------------"
echo "Enter your database details:"
echo ""

read -p "Database name (e.g., my_postgres): " DB_NAME
read -p "Database type (postgres/mysql/sqlserver/mongodb/sqlite): " DB_TYPE
read -p "Database host (e.g., localhost): " DB_HOST
read -p "Database port (default 5432 for postgres): " DB_PORT
read -p "Database name: " DATABASE
read -p "Database username: " DB_USER
read -sp "Database password: " DB_PASSWORD
echo ""

# Set default port if empty
if [ -z "$DB_PORT" ]; then
    case $DB_TYPE in
        postgres) DB_PORT=5432 ;;
        mysql) DB_PORT=3306 ;;
        sqlserver) DB_PORT=1433 ;;
        mongodb) DB_PORT=27017 ;;
        *) DB_PORT=5432 ;;
    esac
fi

# Create databases.json
cat > "$CONFIG_DIR/databases.json" <<EOF
[
  {
    "name": "$DB_NAME",
    "type": "$DB_TYPE",
    "host": "$DB_HOST",
    "port": $DB_PORT,
    "database": "$DATABASE",
    "username": "$DB_USER",
    "password": "$DB_PASSWORD",
    "readOnly": true,
    "ssl": false,
    "maxPoolSize": 5,
    "queryTimeoutMs": 30000
  }
]
EOF

echo "✓ Database configuration saved"
echo ""

# Create Cursor config
CURSOR_CONFIG="$HOME/.cursor/config.json"
echo "Step 7: Cursor Configuration"
echo "------------------------------"

# Check if Cursor config exists
if [ -f "$CURSOR_CONFIG" ]; then
    echo "WARNING: $CURSOR_CONFIG already exists."
    echo "Please manually add the following to your mcpServers section:"
else
    mkdir -p "$HOME/.cursor"
    cat > "$CURSOR_CONFIG" <<EOF
{
  "mcpServers": {
    "multi-database": {
      "command": "mcp-multi-database-server",
      "env": {
        "DATABASE_CONFIG_PATH": "$CONFIG_DIR/databases.json"
      }
    }
  }
}
EOF
    echo "✓ Created: $CURSOR_CONFIG"
fi

echo ""
echo "Add this to your Cursor config mcpServers section:"
echo ""
echo "  \"multi-database\": {"
echo "    \"command\": \"mcp-multi-database-server\","
echo "    \"env\": {"
echo "      \"DATABASE_CONFIG_PATH\": \"$CONFIG_DIR/databases.json\""
echo "    }"
echo "  }"
echo ""

# Final steps
echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Restart Cursor"
echo "2. Test with: 'Show me all available databases'"
echo ""
echo "Configuration files:"
echo "  - Databases: $CONFIG_DIR/databases.json"
echo "  - Cursor config: $CURSOR_CONFIG"
echo ""
echo "To add more databases, edit: $CONFIG_DIR/databases.json"
echo ""
echo "Troubleshooting:"
echo "  - View logs in Cursor Developer Tools (Help > Toggle Developer Tools)"
echo "  - Check package: which mcp-multi-database-server"
echo "  - Verify config paths are correct in $CURSOR_CONFIG"
echo ""
