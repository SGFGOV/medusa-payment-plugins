#!/bin/bash

# Biome Migration Helper Script
# This script helps automate the migration from ESLint to Biome

set -e

echo "🚀 Starting Biome Migration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install Biome
echo -e "${YELLOW}Step 1: Installing Biome...${NC}"
yarn add -D -W @biomejs/biome

# Step 2: Initialize Biome config if it doesn't exist
if [ ! -f "biome.json" ]; then
    echo -e "${YELLOW}Step 2: Initializing Biome configuration...${NC}"
    npx @biomejs/biome init
else
    echo -e "${GREEN}biome.json already exists, skipping initialization${NC}"
fi

# Step 3: Backup ESLint configs
echo -e "${YELLOW}Step 3: Backing up ESLint configurations...${NC}"
mkdir -p .backup/eslint-configs
if [ -f ".eslintrc.js" ]; then
    cp .eslintrc.js .backup/eslint-configs/.eslintrc.js.backup
    echo "  ✓ Backed up root .eslintrc.js"
fi
if [ -f "packages/storefront/.eslintrc.js" ]; then
    cp packages/storefront/.eslintrc.js .backup/eslint-configs/storefront.eslintrc.js.backup
    echo "  ✓ Backed up storefront .eslintrc.js"
fi

# Step 4: Run Biome check to see current state
echo -e "${YELLOW}Step 4: Running Biome check (dry run)...${NC}"
npx @biomejs/biome check . --max-diagnostics=50 || true

# Step 5: Show what would be fixed
echo -e "${YELLOW}Step 5: Preview of auto-fixable issues...${NC}"
echo "Run 'yarn biome check --write .' to auto-fix issues"

# Step 6: Summary
echo -e "\n${GREEN}✅ Migration setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review and customize biome.json"
echo "2. Run: yarn biome check --write ."
echo "3. Update package.json scripts in each package"
echo "4. Test linting: yarn lint"
echo "5. Remove ESLint dependencies when ready"
echo -e "\n${YELLOW}To remove ESLint later:${NC}"
echo "1. Remove ESLint from root package.json devDependencies"
echo "2. Remove ESLint from storefront package.json"
echo "3. Delete .eslintrc.js files"
echo -e "\n${GREEN}Backups saved to: .backup/eslint-configs/${NC}"

