# CI Lockfile Issue Resolution

## Problem Description

The CI/CD pipeline is failing due to yarn lockfile resolution issues. The error message indicates:

```
➤ YN0001: Error: @agoric/base-zone@workspace:*: Workspace not found (@agoric/base-zone@workspace:*)
```

## Root Cause

The issue stems from inconsistencies in the `yarn.lock` file where:

1. Some dependencies reference `@agoric/base-zone@workspace:*` but no such workspace exists in this project
2. The lockfile contains mixed version references that create resolution conflicts
3. Yarn 4.7.0 in hardened mode (used in CI) cannot modify the lockfile to resolve these conflicts

## Resolution Steps

### Option 1: Lockfile Regeneration (Recommended)

1. **Delete the current lockfile:**
   ```bash
   rm yarn.lock
   ```

2. **Regenerate the lockfile in non-hardened mode:**
   ```bash
   yarn install --mode=update-lockfile
   ```

3. **Commit the new lockfile:**
   ```bash
   git add yarn.lock
   git commit -m "Regenerate yarn.lock to fix dependency resolution"
   ```

### Option 2: Dependency Resolution Fixes

1. **Add yarn resolutions to package.json:**
   ```json
   {
     "resolutions": {
       "@agoric/base-zone": "^0.1.1-upgrade-16a-dev-fb592e4.0+fb592e4"
     }
   }
   ```

2. **Update yarn.lock:**
   ```bash
   yarn install
   ```

### Option 3: Manual Lockfile Edit

1. **Search for workspace references:**
   ```bash
   grep -n "workspace:" yarn.lock
   ```

2. **Replace any `@agoric/base-zone@workspace:*` references with appropriate npm versions**

## Prevention

To prevent similar issues in the future:

1. **Use exact versions** for Agoric dependencies in `package.json`
2. **Test dependency changes locally** before committing
3. **Use `yarn install --frozen-lockfile`** in CI to catch lockfile issues early
4. **Keep dependencies aligned** with the Agoric SDK version being used

## Current Status

The CI issue is blocking the Far to zone.exo migration. Until the lockfile is fixed, the project should:

1. Remain using `Far` for creating remote objects
2. Address the lockfile issue as a separate task
3. Consider the zone.exo migration as a future enhancement

## Testing the Fix

After implementing any of the above solutions, verify by running:

```bash
yarn install --frozen-lockfile
yarn test
yarn lint
```

All commands should succeed without errors.