# Node 22 Compatibility

## Current Status

This document describes the current state of Node 22 compatibility for the dapp-offer-up project.

## Issues Fixed

### ✅ better-sqlite3 Compatibility

- **Issue**: The project was using better-sqlite3 versions 8.7.0 and 9.6.0 which don't support Node 22.
- **Solution**: Updated to better-sqlite3 v10.1.0 which supports Node 22.
- **Changes**: 
  - Added `"better-sqlite3": "^10.0.0"` to package.json resolutions
  - Updated yarn.lock to use the new version
- **Status**: ✅ Fixed and tested

## Issues Remaining

### ❌ ESM Module Compatibility

- **Issue**: The project uses the `esm` module from `github:agoric-labs/esm#Agoric-built` which is not compatible with Node 22.
- **Error**: Node crashes with assertion failure when using ESM module:
  ```
  #  Assertion failed: (args.Length()) >= (2)
  ----- JavaScript stack trace -----
  1: /home/runner/work/dapp-offer-up/dapp-offer-up/node_modules/esm/esm.js:1:155566
  ```
- **Root Cause**: The ESM module is a fork that hasn't been updated for Node 22 compatibility.
- **Solution**: Upgrade to a newer version of the Agoric SDK that no longer depends on the ESM module.

## Testing Results

### Node 20 (Current)
- ✅ All builds pass
- ✅ All tests pass
- ✅ better-sqlite3 works correctly

### Node 22 (Target)
- ❌ Build fails due to ESM module assertion error
- ✅ better-sqlite3 works correctly (after rebuild)
- ❌ Cannot run tests due to ESM module failure

## Next Steps

To fully achieve Node 22 compatibility, the project needs to:

1. **Upgrade Agoric SDK**: Update to a version that has removed the ESM dependency (likely v0.22.0-u17 or later)
2. **Update Dependencies**: Ensure all @agoric/* packages are compatible with the newer SDK
3. **Test Thoroughly**: Verify all functionality works with the new SDK version

## References

- [Agoric SDK Issue #4788](https://github.com/Agoric/agoric-sdk/issues/4788) - Remove remaining 'esm' module loader dependencies
- [Agoric SDK Issue #11272](https://github.com/Agoric/agoric-sdk/issues/11272) - Bump better-sqlite3 to 10+

Both issues are closed, indicating the fixes are available in newer versions of the Agoric SDK.