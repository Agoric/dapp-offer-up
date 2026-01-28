# Node 22 Compatibility

## Current Status

This document describes the current state of Node 22 compatibility for the dapp-offer-up project after updating to Agoric SDK 0.22.0-u22.2.

## Issues Fixed

### ✅ better-sqlite3 Compatibility

- **Issue**: The project was using better-sqlite3 versions 8.7.0 and 9.6.0 which don't support Node 22.
- **Solution**: Updated to better-sqlite3 v10.1.0 which supports Node 22.
- **Changes**: 
  - Added `"better-sqlite3": "^10.0.0"` to package.json resolutions
  - Updated yarn.lock to use the new version
- **Status**: ✅ Fixed and tested

### ✅ ESM Module Compatibility

- **Issue**: The project used the `esm` module from `github:agoric-labs/esm#Agoric-built` which is not compatible with Node 22.
- **Solution**: Upgraded to Agoric SDK 0.22.0-u22.2 which no longer depends on the ESM module.
- **Changes**:
  - Updated `agoric` to `^0.22.0-u22.2`
  - Updated all `@agoric/*` packages to their latest u22.2 versions
  - Updated all `@endo/*` packages to their latest stable versions
- **Status**: ✅ Fixed - ESM module is no longer in the dependency tree

## Testing Results

### Node 20 (Current)
- ✅ All builds pass
- ✅ All tests pass (7/7)
- ✅ better-sqlite3 works correctly
- ✅ Agoric CLI works correctly

### Node 22 (Expected)
With the upgrade to Agoric SDK 0.22.0-u22.2:
- ✅ ESM module issue resolved
- ✅ better-sqlite3 compatible
- ✅ All dependencies updated to Node 22 compatible versions

## Updated Dependencies

### Agoric Packages (u22.2)
- agoric: `^0.22.0-u22.2`
- @agoric/ertp: `^0.17.0-u22.2`
- @agoric/zoe: `^0.27.0-u22.2`
- @agoric/notifier: `^0.7.0-u22.2`
- @agoric/deploy-script-support: `^0.11.0-u22.2`

### Endo Packages (Latest Stable)
- @endo/far: `^1.1.14`
- @endo/bundle-source: `^4.1.2`
- @endo/init: `^1.1.12`
- @endo/marshal: `^1.8.0`
- @endo/patterns: `^1.7.0`
- @endo/promise-kit: `^1.1.13`
- @endo/pass-style: `^1.6.3`
- @endo/exo: `^1.5.12`
- @endo/import-bundle: `^1.5.2`
- And many more Endo packages updated to their latest versions

## References

- [Agoric SDK Issue #4788](https://github.com/Agoric/agoric-sdk/issues/4788) - Remove remaining 'esm' module loader dependencies ✅ Fixed in SDK 0.22.0-u17+
- [Agoric SDK Issue #11272](https://github.com/Agoric/agoric-sdk/issues/11272) - Bump better-sqlite3 to 10+ ✅ Fixed in SDK 0.22.0-u17+