# Migration Plan: ESLint → Biome in Turborepo Monorepo

## Overview
This plan outlines the steps to migrate from ESLint + Prettier to Biome (which combines linting and formatting) across all packages in the monorepo.

## Benefits of Migration
- **Faster**: Biome is written in Rust and is 10-100x faster than ESLint
- **All-in-one**: Replaces both ESLint and Prettier
- **Zero config**: Works out of the box with sensible defaults
- **TypeScript-first**: Native TypeScript support
- **Turborepo-friendly**: Better caching and parallel execution

## Current State Analysis

### ESLint Configuration Files
- Root: `.eslintrc.js` (main config with TypeScript, React, Prettier integration)
- Storefront: `packages/storefront/.eslintrc.js` (Next.js config)

### Packages with Lint Scripts
1. `medusa-plugin-razorpay-v2` - TypeScript
2. `medusa-plugin-btcpay` - TypeScript
3. `test-server` - TypeScript
4. `storefront` - Next.js (uses `next lint`)

### Current ESLint Dependencies (Root)
- `eslint` (^8.3.0)
- `@typescript-eslint/eslint-plugin` (^5.4.0)
- `@typescript-eslint/parser` (^5.4.0)
- `typescript-eslint` (^8.35.0) - *Note: This is a newer version, may conflict*
- `eslint-config-airbnb-base` (^15.0.0)
- `eslint-config-google` (^0.14.0)
- `eslint-config-prettier` (^8.5.0)
- `eslint-config-typescript` (^3.0.0)
- `eslint-plugin-file-progress` (^1.3.0)
- `eslint-plugin-import` (^2.22.1)
- `eslint-plugin-jsx-a11y` (^6.4.1)
- `eslint-plugin-prettier` (^4.2.1)
- `eslint-plugin-react` (^7.22.0)
- `eslint-plugin-react-hooks` (^4.6.2)
- `prettier` (^2.7.1)

## Migration Steps

### Phase 1: Preparation & Setup

#### Step 1.1: Install Biome
```bash
# At root level
yarn add -D -W @biomejs/biome
```

#### Step 1.2: Initialize Biome Configuration
```bash
# Generate initial biome.json
npx @biomejs/biome init
```

#### Step 1.3: Create Root Biome Config
Create `biome.json` at root with workspace-aware configuration:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.medusa/**",
      "**/coverage/**",
      "**/*.js",
      "**/yarn.lock",
      "**/package-lock.json"
    ]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 4,
    "lineEnding": "lf",
    "lineWidth": 80,
    "attributePosition": "auto"
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noBannedTypes": "error",
        "noUselessTypeConstraint": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noParameterAssign": "error",
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "jsxQuoteStyle": "double",
      "trailingCommas": "none",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    },
    "globals": ["jest", "NodeJS"]
  },
  "overrides": [
    {
      "include": ["packages/storefront/**"],
      "linter": {
        "rules": {
          "correctness": {
            "useExhaustiveDependencies": "warn"
          },
          "suspicious": {
            "noArrayIndexKey": "off"
          }
        }
      }
    }
  ]
}
```

### Phase 2: Update Package Scripts

#### Step 2.1: Update Root package.json
Replace lint scripts:
```json
{
  "scripts": {
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "check": "biome check .",
    "check:fix": "biome check --write ."
  }
}
```

#### Step 2.2: Update Package Scripts

**For TypeScript packages** (`medusa-plugin-razorpay-v2`, `medusa-plugin-btcpay`, `test-server`):
```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  }
}
```

**For Storefront** (Next.js):
```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  }
}
```
*Note: Storefront currently uses `next lint`. You can either:*
- *Option A: Fully migrate to Biome (recommended - Biome has React/Next.js support)*
- *Option B: Keep both temporarily: `biome check . && next lint`*
- *Option C: Use Biome for formatting, keep Next.js lint for React-specific rules*

### Phase 3: Migrate Configuration Rules

#### Step 3.1: Map ESLint Rules to Biome

Key rule mappings from your `.eslintrc.js`:

| ESLint Rule | Biome Equivalent |
|------------|------------------|
| `@typescript-eslint/explicit-function-return-type` | `style/noInferrableTypes` (inverse) |
| `@typescript-eslint/no-non-null-assertion` | `suspicious/noExplicitAny` (similar) |
| `react-hooks/rules-of-hooks` | `correctness/useExhaustiveDependencies` |
| `react-hooks/exhaustive-deps` | `correctness/useExhaustiveDependencies` |
| `no-use-before-define` | `correctness/noUseBeforeDefine` |
| `object-curly-spacing` | Formatter (bracketSpacing) |
| `quotes` | Formatter (quoteStyle) |
| `semi` | Formatter (semicolons) |
| `camelcase` | `style/useNamingConvention` |

#### Step 3.2: Handle TypeScript-Specific Rules
Add to biome.json:
```json
{
  "linter": {
    "rules": {
      "style": {
        "useNamingConvention": {
          "level": "off"
        }
      },
      "correctness": {
        "noUnusedVariables": {
          "level": "error",
          "fix": "safe"
        }
      }
    }
  }
}
```

### Phase 4: Remove ESLint Dependencies

#### Step 4.1: Remove from Root package.json
Remove these devDependencies (exact list):
- `eslint` (^8.3.0)
- `@typescript-eslint/eslint-plugin` (^5.4.0)
- `@typescript-eslint/parser` (^5.4.0)
- `typescript-eslint` (^8.35.0) - *Note: Check if this is actually used*
- `eslint-config-airbnb-base` (^15.0.0)
- `eslint-config-google` (^0.14.0)
- `eslint-config-prettier` (^8.5.0)
- `eslint-config-typescript` (^3.0.0)
- `eslint-plugin-file-progress` (^1.3.0)
- `eslint-plugin-import` (^2.22.1)
- `eslint-plugin-jsx-a11y` (^6.4.1)
- `eslint-plugin-prettier` (^4.2.1)
- `eslint-plugin-react` (^7.22.0)
- `eslint-plugin-react-hooks` (^4.6.2)
- `prettier` (^2.7.1) - *Biome replaces Prettier*

#### Step 4.2: Remove from Storefront package.json
- `eslint`
- `eslint-config-next`

#### Step 4.3: Delete ESLint Config Files
```bash
rm .eslintrc.js
rm packages/storefront/.eslintrc.js
```

### Phase 5: Update CI/CD & Editor Integration

#### Step 5.1: Update GitHub Actions
If you have lint checks in workflows, update:
```yaml
- name: Lint
  run: yarn biome check .
```

#### Step 5.2: Update Editor Settings
Create/update `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

#### Step 5.3: Update .gitignore
Add Biome cache if needed:
```
.biome/
```

### Phase 6: Handle Special Cases

#### Step 6.1: React/Next.js Storefront
- Biome has native React support
- For Next.js-specific rules, either:
  - Keep `next lint` alongside Biome (temporary)
  - Or fully migrate to Biome (recommended)

#### Step 6.2: TypeScript Decorators
Your ESLint config has `experimentalDecorators: true`. Biome supports decorators natively.

#### Step 6.3: File-Specific Overrides
Convert ESLint overrides to Biome overrides:
```json
{
  "overrides": [
    {
      "include": ["**/api/**/*.ts"],
      "linter": {
        "rules": {
          "style": {
            "noInferrableTypes": "off"
          }
        }
      }
    }
  ]
}
```

### Phase 7: Migration Execution Order

1. **Week 1: Setup & Testing**
   - Install Biome
   - Create biome.json
   - Test on one package (e.g., `medusa-plugin-razorpay-v2`)
   - Compare outputs with ESLint

2. **Week 2: Rollout**
   - Update all package scripts
   - Run `biome check --write` to auto-fix issues
   - Review and adjust biome.json based on results

3. **Week 3: Cleanup**
   - Remove ESLint dependencies
   - Delete ESLint config files
   - Update CI/CD pipelines
   - Update documentation

4. **Week 4: Optimization**
   - Fine-tune Biome rules
   - Update team documentation
   - Train team on Biome

### Phase 8: Testing Checklist

- [ ] Run `biome check` on all packages
- [ ] Verify formatting matches Prettier output
- [ ] Check TypeScript-specific rules work
- [ ] Verify React/Next.js rules work
- [ ] Test in CI/CD pipeline
- [ ] Verify editor integration
- [ ] Check Turborepo caching works
- [ ] Compare lint results with ESLint (should catch same issues)

### Phase 9: Rollback Plan

If issues arise:
1. Keep ESLint configs in `.backup` folder
2. Revert package.json scripts
3. Reinstall ESLint dependencies
4. Document issues for future migration attempt

## Quick Start Commands

```bash
# Install Biome
yarn add -D -W @biomejs/biome

# Initialize config
npx @biomejs/biome init

# Check all files
yarn biome check .

# Auto-fix all issues
yarn biome check --write .

# Format all files
yarn biome format --write .

# Check specific package
yarn biome check packages/medusa-plugin-razorpay-v2

# Check with zero warnings (matching current --max-warnings 0 behavior)
yarn biome check . --only=errors

# Check and show summary
yarn biome check . --verbose
```

## Important Notes & Considerations

### Repository-Specific Notes
- **Storefront is excluded from workspaces**: The root `package.json` has `"!packages/storefront"` in workspaces, so storefront manages its own dependencies
- **Version conflicts**: Root has both `@typescript-eslint/*` (v5.4.0) and `typescript-eslint` (v8.35.0) - verify which is actually used
- **Current lint commands**: All TypeScript packages use `npx eslint . --ext .ts,.tsx --max-warnings 0`
- **Storefront uses Next.js lint**: Currently `next lint` which has its own ESLint config

### General Notes
- Biome is faster, so CI/CD will be quicker
- Biome's formatter is opinionated but configurable
- Some ESLint plugins may not have Biome equivalents (e.g., `file-progress` - this is just a progress indicator, not critical)
- Biome doesn't support all ESLint rules, but covers 90%+ of common use cases
- Biome has better TypeScript support out of the box
- Biome supports React/JSX natively, so Next.js migration should be straightforward
- The `--max-warnings 0` flag in current scripts means zero tolerance - Biome defaults to warnings, adjust if needed

## Resources

- [Biome Documentation](https://biomejs.dev/)
- [Biome Migration Guide](https://biomejs.dev/guides/migrate-from-eslint-prettier/)
- [Biome Rules](https://biomejs.dev/reference/rules/)

