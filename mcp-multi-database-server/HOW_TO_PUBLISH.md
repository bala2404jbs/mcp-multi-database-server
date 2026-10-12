# How to Publish to GitHub Packages

## Prerequisites

1. Create a GitHub repository for this project
2. Get a GitHub Personal Access Token with `write:packages` permission

## Steps to Publish

### 1. Initialize Git Repository

```bash
cd mcp-multi-database-server
git init
git add .
git commit -m "Initial commit"
```

### 2. Create GitHub Repository

Go to https://github.com/new and create a new repository named `mcp-multi-database-server`

### 3. Add Remote and Push

```bash
git remote add origin https://github.com/bala2404jbs/mcp-multi-database-server.git
git branch -M main
git push -u origin main
```

### 4. Authenticate with GitHub Packages

```bash
npm login --scope=@bala2404jbs --registry=https://npm.pkg.github.com
```

When prompted:
- Username: `bala2404jbs`
- Password: Your GitHub Personal Access Token (not your GitHub password)
- Email: Your email

### 5. Build and Publish

```bash
npm run build
npm publish
```

## After Publishing

Your team can then install with:

```bash
npm config set @bala2404jbs:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken THEIR_GITHUB_TOKEN
npm install -g @bala2404jbs/mcp-multi-database-server
```

## Quick Test if Package is Published

```bash
npm view @bala2404jbs/mcp-multi-database-server --registry=https://npm.pkg.github.com
```

If published, you'll see package details. If not, you'll see an error.
