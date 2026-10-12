# MCP Multi-Database Server - Installation Script
# For Windows PowerShell

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MCP Multi-Database Server - Team Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = (node -v) -replace 'v', ''
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 18) {
        Write-Host "ERROR: Node.js version must be 18 or newer. Current: v$nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node.js v$nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js 18 or newer from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Write-Host "✓ npm $npmVersion detected" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not installed." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Prompt for GitHub token
Write-Host "Step 1: GitHub Authentication" -ForegroundColor Yellow
Write-Host "------------------------------"
Write-Host "You need a GitHub Personal Access Token with 'read:packages' permission."
Write-Host "Get one at: https://github.com/settings/tokens"
Write-Host ""
$GITHUB_TOKEN = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
$GITHUB_TOKEN_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GITHUB_TOKEN))

if ([string]::IsNullOrEmpty($GITHUB_TOKEN_PLAIN)) {
    Write-Host "ERROR: GitHub token is required." -ForegroundColor Red
    exit 1
}

# Configure npm
Write-Host ""
Write-Host "Step 2: Configuring npm..." -ForegroundColor Yellow
Write-Host "------------------------------"
npm config set "@bala2404jbs:registry" "https://npm.pkg.github.com"
npm config set "//npm.pkg.github.com/:_authToken" $GITHUB_TOKEN_PLAIN
Write-Host "✓ npm configured for GitHub Packages" -ForegroundColor Green
Write-Host ""

# Install package
Write-Host "Step 3: Installing package..." -ForegroundColor Yellow
Write-Host "------------------------------"
npm install -g "@bala2404jbs/mcp-multi-database-server"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Package installation failed." -ForegroundColor Red
    Write-Host "Please check your GitHub token and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Package installed successfully" -ForegroundColor Green
Write-Host ""

# Get package path
$npmRoot = npm root -g
$PACKAGE_PATH = Join-Path $npmRoot "@bala2404jbs\mcp-multi-database-server"

if (-not (Test-Path $PACKAGE_PATH)) {
    Write-Host "ERROR: Package not found after installation." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Package verified at: $PACKAGE_PATH" -ForegroundColor Green
Write-Host ""

# Create config directory
$CONFIG_DIR = Join-Path $env:USERPROFILE ".mcp-database"
Write-Host "Step 4: Creating configuration directory..." -ForegroundColor Yellow
Write-Host "------------------------------"
New-Item -ItemType Directory -Force -Path $CONFIG_DIR | Out-Null
Write-Host "✓ Created: $CONFIG_DIR" -ForegroundColor Green
Write-Host ""

# Copy example files
Write-Host "Step 5: Setting up configuration files..." -ForegroundColor Yellow
Write-Host "------------------------------"
$exampleFile = Join-Path $PACKAGE_PATH "databases.json.example"
$configFile = Join-Path $CONFIG_DIR "databases.json"
Copy-Item $exampleFile $configFile
Write-Host "✓ Created: $configFile" -ForegroundColor Green
Write-Host ""

# Prompt for database configuration
Write-Host "Step 6: Database Configuration" -ForegroundColor Yellow
Write-Host "------------------------------"
Write-Host "Enter your database details:"
Write-Host ""

$DB_NAME = Read-Host "Database name (e.g., my_postgres)"
$DB_TYPE = Read-Host "Database type (postgres/mysql/sqlserver/mongodb/sqlite)"
$DB_HOST = Read-Host "Database host (e.g., localhost)"
$DB_PORT_INPUT = Read-Host "Database port (press Enter for default)"
$DATABASE = Read-Host "Database name"
$DB_USER = Read-Host "Database username"
$DB_PASSWORD = Read-Host "Database password" -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

# Set default port if empty
if ([string]::IsNullOrEmpty($DB_PORT_INPUT)) {
    switch ($DB_TYPE) {
        "postgres" { $DB_PORT = 5432 }
        "mysql" { $DB_PORT = 3306 }
        "sqlserver" { $DB_PORT = 1433 }
        "mongodb" { $DB_PORT = 27017 }
        default { $DB_PORT = 5432 }
    }
} else {
    $DB_PORT = [int]$DB_PORT_INPUT
}

# Create databases.json
$dbConfig = @"
[
  {
    "name": "$DB_NAME",
    "type": "$DB_TYPE",
    "host": "$DB_HOST",
    "port": $DB_PORT,
    "database": "$DATABASE",
    "username": "$DB_USER",
    "password": "$DB_PASSWORD_PLAIN",
    "readOnly": true,
    "ssl": false,
    "maxPoolSize": 5,
    "queryTimeoutMs": 30000
  }
]
"@

$dbConfig | Out-File -FilePath $configFile -Encoding UTF8
Write-Host "✓ Database configuration saved" -ForegroundColor Green
Write-Host ""

# Create Cursor config
$CURSOR_CONFIG = Join-Path $env:USERPROFILE ".cursor\config.json"
Write-Host "Step 7: Cursor Configuration" -ForegroundColor Yellow
Write-Host "------------------------------"

$configFileEscaped = $configFile -replace '\\', '\\'

if (Test-Path $CURSOR_CONFIG) {
    Write-Host "WARNING: $CURSOR_CONFIG already exists." -ForegroundColor Yellow
    Write-Host "Please manually add the following to your mcpServers section:"
} else {
    $cursorDir = Join-Path $env:USERPROFILE ".cursor"
    New-Item -ItemType Directory -Force -Path $cursorDir | Out-Null
    
    $cursorConfig = @"
{
  "mcpServers": {
    "multi-database": {
      "command": "mcp-multi-database-server",
      "env": {
        "DATABASE_CONFIG_PATH": "$configFileEscaped"
      }
    }
  }
}
"@
    $cursorConfig | Out-File -FilePath $CURSOR_CONFIG -Encoding UTF8
    Write-Host "✓ Created: $CURSOR_CONFIG" -ForegroundColor Green
}

Write-Host ""
Write-Host "Add this to your Cursor config mcpServers section:" -ForegroundColor Cyan
Write-Host ""
Write-Host '  "multi-database": {' -ForegroundColor White
Write-Host '    "command": "mcp-multi-database-server",' -ForegroundColor White
Write-Host '    "env": {' -ForegroundColor White
Write-Host "      `"DATABASE_CONFIG_PATH`": `"$configFileEscaped`"" -ForegroundColor White
Write-Host '    }' -ForegroundColor White
Write-Host '  }' -ForegroundColor White
Write-Host ""

# Final steps
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Cursor"
Write-Host "2. Test with: 'Show me all available databases'"
Write-Host ""
Write-Host "Configuration files:" -ForegroundColor Yellow
Write-Host "  - Databases: $configFile"
Write-Host "  - Cursor config: $CURSOR_CONFIG"
Write-Host ""
Write-Host "To add more databases, edit: $configFile"
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  - View logs in Cursor Developer Tools (Help > Toggle Developer Tools)"
Write-Host "  - Check package: where.exe mcp-multi-database-server"
Write-Host "  - Verify config paths are correct in $CURSOR_CONFIG"
Write-Host ""
