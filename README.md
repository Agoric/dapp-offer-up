# Agoric Smart Contracts

To run a simple test of a basic smart contract:

1. Install npm dependencies

The contract depends on the [endo](https://endojs.github.io/endo/) distributed objects framework, and we use the [ava](https://github.com/avajs/ava#readme) test framework:

```sh
node --version # 18.x or 20.x
corepack enable
yarn
```

2. Run the test

```sh
yarn ava
```

For more info, see [Agoric Docs](https://docs.agoric.com/).
