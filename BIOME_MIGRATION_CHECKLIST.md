# Biome Migration Checklist

Use this checklist to track your migration progress.

## Pre-Migration Verification

- [ ] Review current ESLint errors: `yarn lint` (baseline)
- [ ] Document any custom ESLint rules that are critical
- [ ] Check which packages actually use ESLint vs Next.js lint
- [ ] Verify `typescript-eslint` v8.35.0 usage (may be unused)

## Phase 1: Setup

- [ ] Install Biome: `yarn add -D -W @biomejs/biome`
- [ ] Create `biome.json` (use `biome.json.example` as starting point)
- [ ] Test Biome on one package: `yarn biome check packages/medusa-plugin-razorpay-v2`
- [ ] Compare Biome output with ESLint output
- [ ] Adjust `biome.json` rules to match current ESLint behavior

## Phase 2: Package Scripts

- [ ] Update root `package.json` scripts
- [ ] Update `packages/medusa-plugin-razorpay-v2/package.json` scripts
- [ ] Update `packages/medusa-plugin-btcpay/package.json` scripts
- [ ] Update `packages/test-server/package.json` scripts
- [ ] Update `packages/storefront/package.json` scripts
- [ ] Test `yarn lint` at root level
- [ ] Test `yarn lint` in each package individually

## Phase 3: Auto-Fix & Review

- [ ] Run `yarn biome check --write .` to auto-fix issues
- [ ] Review auto-fixed changes in git diff
- [ ] Manually fix any remaining issues
- [ ] Verify code still compiles: `yarn build`
- [ ] Verify tests still pass: `yarn test`

## Phase 4: Configuration Refinement

- [ ] Map all ESLint rules from `.eslintrc.js` to Biome equivalents
- [ ] Add any missing overrides for specific file patterns
- [ ] Test storefront-specific rules work correctly
- [ ] Verify TypeScript decorator support
- [ ] Check React/Next.js rules are appropriate

## Phase 5: CI/CD Updates

- [ ] Update GitHub Actions workflows (if any)
- [ ] Test CI pipeline with Biome
- [ ] Verify Turborepo caching works with Biome
- [ ] Check lint times are faster

## Phase 6: Editor Integration

- [ ] Install Biome VS Code extension (if using VS Code)
- [ ] Update `.vscode/settings.json`
- [ ] Test format on save
- [ ] Verify editor shows Biome diagnostics

## Phase 7: Cleanup

- [ ] Remove ESLint from root `package.json` devDependencies
- [ ] Remove ESLint from storefront `package.json` devDependencies
- [ ] Delete `.eslintrc.js`
- [ ] Delete `packages/storefront/.eslintrc.js`
- [ ] Remove Prettier from dependencies (if not used elsewhere)
- [ ] Update `.gitignore` if needed

## Phase 8: Documentation

- [ ] Update README with new lint commands
- [ ] Document Biome configuration decisions
- [ ] Create team guide for Biome usage
- [ ] Update contributing guidelines

## Phase 9: Final Verification

- [ ] All packages lint successfully
- [ ] Formatting is consistent across all packages
- [ ] No regressions in code quality
- [ ] CI/CD passes
- [ ] Team is trained on Biome

## Rollback Preparation

- [ ] ESLint configs backed up in `.backup/eslint-configs/`
- [ ] Document any issues encountered
- [ ] Know how to revert if needed

## Post-Migration

- [ ] Monitor for any issues in first week
- [ ] Gather team feedback
- [ ] Fine-tune Biome rules based on usage
- [ ] Celebrate faster lint times! 🎉

