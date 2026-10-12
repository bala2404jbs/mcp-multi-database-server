# Publishing MCP Multi-Database Server to Private npm Registry

This guide covers how to publish and use this MCP server as a private npm package.

## Prerequisites

- npm account with access to your organization
- Access to a private npm registry (npm Enterprise, GitHub Packages, or similar)
- Built package (`npm run build` completed)

## Option A: GitHub Packages (Recommended)

### Initial Setup for Publisher

1. Create a Personal Access Token (PAT) on GitHub:
   - Go to Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scopes: `write:packages`, `read:packages`, `delete:packages`
   - Copy the token

2. Authenticate with GitHub Packages:

```bash
npm login --scope=@yourorg --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: your-personal-access-token
# Email: your-email@example.com
```

3. Update package.json with your GitHub organization:

```json
{
  "name": "@yourorg/mcp-multi-database-server",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourorg/mcp-multi-database-server.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

Replace `@yourorg` with your actual GitHub organization or username.

### Publishing the Package

1. Ensure the package is built:

```bash
npm run build
```

2. Verify the package contents before publishing:

```bash
npm pack --dry-run
```

This shows what files will be included.

3. Publish to GitHub Packages:

```bash
npm publish
```

4. For subsequent updates, increment version and republish:

```bash
npm version patch  # or minor, or major
npm publish
```

### Team Member Setup (GitHub Packages)

Each team member needs to:

1. Create their own GitHub Personal Access Token with `read:packages` scope

2. Create or update `~/.npmrc`:

```bash
echo "@yourorg:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

Replace `YOUR_GITHUB_TOKEN` with their token.

3. Install the package globally:

```bash
npm install -g @yourorg/mcp-multi-database-server
```

4. Create configuration directory:

```bash
mkdir -p ~/.mcp-database
cd ~/.mcp-database
```

5. Copy example configuration files:

```bash
cp $(npm root -g)/@yourorg/mcp-multi-database-server/databases.json.example databases.json
cp $(npm root -g)/@yourorg/mcp-multi-database-server/users.json.example users.json
```

6. Edit `databases.json` with their database credentials

7. Add to Cursor MCP settings (`~/.cursor/config.json` or Cursor Settings UI):

```json
{
  "mcpServers": {
    "multi-database": {
      "command": "mcp-multi-database-server",
      "env": {
        "DATABASE_CONFIG_PATH": "/home/username/.mcp-database/databases.json",
        "USERS_CONFIG_PATH": "/home/username/.mcp-database/users.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

8. Restart Cursor

## Option B: npm Enterprise (Private Registry)

### Initial Setup for Publisher

1. Authenticate with your private registry:

```bash
npm login --registry=https://your-registry.yourcompany.com
```

2. Update package.json:

```json
{
  "name": "@yourorg/mcp-multi-database-server",
  "publishConfig": {
    "registry": "https://your-registry.yourcompany.com"
  }
}
```

3. Publish:

```bash
npm run build
npm publish
```

### Team Member Setup (npm Enterprise)

1. Configure npm to use your private registry:

```bash
npm config set registry https://your-registry.yourcompany.com
npm login
```

2. Install globally:

```bash
npm install -g @yourorg/mcp-multi-database-server
```

3. Follow steps 4-8 from GitHub Packages setup above

## Option C: Verdaccio (Self-Hosted Private Registry)

If you want to host your own private npm registry:

### Setup Verdaccio Server

1. Install Verdaccio:

```bash
npm install -g verdaccio
```

2. Start Verdaccio:

```bash
verdaccio
```

By default, it runs on http://localhost:4873

3. Configure for team access (edit `~/.config/verdaccio/config.yaml`):

```yaml
auth:
  htpasswd:
    file: ./htpasswd
    max_users: 1000

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  '@yourorg/*':
    access: $authenticated
    publish: $authenticated
    unpublish: $authenticated

  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs
```

### Publishing to Verdaccio

1. Add user:

```bash
npm adduser --registry http://localhost:4873
```

2. Publish:

```bash
npm publish --registry http://localhost:4873
```

### Team Member Setup (Verdaccio)

1. Configure npm:

```bash
npm set registry http://your-verdaccio-server:4873
npm adduser
```

2. Install and configure (same as above)

## Version Management

Use semantic versioning:

- **Patch** (1.0.X): Bug fixes, minor changes
  ```bash
  npm version patch
  npm publish
  ```

- **Minor** (1.X.0): New features, backward compatible
  ```bash
  npm version minor
  npm publish
  ```

- **Major** (X.0.0): Breaking changes
  ```bash
  npm version major
  npm publish
  ```

## Package Updates for Team Members

When a new version is published, team members update with:

```bash
npm update -g @yourorg/mcp-multi-database-server
```

Or install specific version:

```bash
npm install -g @yourorg/mcp-multi-database-server@1.2.3
```

## Security Considerations

1. **Never commit tokens**: Add `.npmrc` to `.gitignore`
2. **Token scope**: Use minimum required permissions
3. **Token rotation**: Rotate tokens periodically
4. **Access control**: Use private registry features to control access
5. **Configuration security**: Team members should store `databases.json` securely

## Troubleshooting

### Authentication Issues

```bash
# Clear npm cache
npm cache clean --force

# Re-authenticate
npm logout
npm login --scope=@yourorg --registry=https://npm.pkg.github.com
```

### Package Not Found

```bash
# Verify registry configuration
npm config get registry
npm config get @yourorg:registry

# Search for the package
npm search @yourorg/mcp-multi-database-server --registry=https://npm.pkg.github.com
```

### Installation Issues

```bash
# Check global packages
npm list -g --depth=0

# Reinstall
npm uninstall -g @yourorg/mcp-multi-database-server
npm install -g @yourorg/mcp-multi-database-server
```

## CI/CD Integration

For automated publishing:

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Team Onboarding Checklist

Send this checklist to new team members:

- [ ] Get GitHub Personal Access Token (or registry credentials)
- [ ] Configure npm authentication
- [ ] Install package globally: `npm install -g @yourorg/mcp-multi-database-server`
- [ ] Create config directory: `mkdir -p ~/.mcp-database`
- [ ] Copy and edit `databases.json` with your credentials
- [ ] Add MCP server to Cursor settings
- [ ] Restart Cursor
- [ ] Test with: "Show me all available databases"

## Support

For package-related issues:
- Check the registry: https://github.com/yourorg/mcp-multi-database-server/packages
- View package details: `npm view @yourorg/mcp-multi-database-server`
- Report issues: Create an issue in the repository
