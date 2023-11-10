# Agoric App Starter: Simple Game

This is a simple app for the [Agoric smart contract platform](https://docs.agoric.com/).

The contract lets you give a small amount of [IST](https://inter.trade/) in exchange for
a few NFTs that represent places in a hypothetical game.

The UI is a React app started with the [vite](https://vitejs.dev/) `react-ts` template.
On top of that, we add

- Watching [blockchain state queries](https://docs.agoric.com/guides/getting-started/contract-rpc.html#querying-vstorage)
- [Signing and sending offers](https://docs.agoric.com/guides/getting-started/contract-rpc.html#signing-and-broadcasting-offers)

## Getting started: UI

Prerequisites: `node`, `yarn`

```sh
yarn
yarn dev
```

## Getting started: Deploy to Local Blockchain

Prerequisites: [Agoric SDK](https://docs.agoric.com/guides/getting-started/), `docker-compose`.

Build the contract and a proposal to start it:

```sh
yarn build:contract
yarn build:proposal
```

Start local chain using docker-compose:

```sh
yarn start:docker
yarn docker:logs
```

We need a few 1000 IST to pay for contract bundle installation:

```sh
yarn make:help
yarn docker:make balance-q
yarn docker:make mint4k
yarn docker:make balance-q
```

To explore in the container where the node runs:

```sh
yarn docker:bash
agd query vstorage children published.priceFeed
```
