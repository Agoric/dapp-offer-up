# Agoric App Starter: Simple Game

This is a simple app for the [Agoric smart contract platform](https://docs.agoric.com/).

The contract lets you give a small amount of [IST](https://inter.trade/) in exchange for
a few NFTs that represent places in a hypothetical game.

The UI is a React app started with the [vite](https://vitejs.dev/) `react-ts` template.
On top of that, we add

- Watching [blockchain state queries](https://docs.agoric.com/guides/getting-started/contract-rpc.html#querying-vstorage)
- [Signing and sending offers](https://docs.agoric.com/guides/getting-started/contract-rpc.html#signing-and-broadcasting-offers)

## Getting started: test the contract

Prerequisites: `agoric` CLI from [Installing the Agoric SDK](https://docs.agoric.com/guides/getting-started/).

```sh
agoric --version
agoric install
cd contract
yarn
yarn test
```

## Getting started: Deploy to Local Blockchain

Prerequisites: `docker-compose`, [gov proposal hub](https://github.com/0xpatrickdev/agoric-gov-proposal-hub).

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

Build the proposal to start the contract:

```sh
cd contract
yarn build:proposal
```

The filenames of bundles, a permit, and a script are printed.

Use the **Install Bundle** tab of the gov proposal hub to install the
2 bundles. Get ready to vote with `yarn docker:make vote PROPOSAL=n`.
Use the **CoreEval Proposal** tab to propose `start-game1-permit.json`
and `start-game1.js`. Note the proposal number; supposing it is 7, use
`yarn docker:make vote PROPOSAL=7`. Note the voting period is very
short! 10s by default.

## Buy some game places with the dapp UI

Prerequisites: `node`, `yarn`, keplr.

```sh
cd ui
yarn
yarn dev
```

Use `docker:bash` command to print account info, including `user1`.
Add that account to keplr.

Then hit **Connect Wallet**. The UI should show your address.

Then **Make Offer**. Keplr should show an offer to **give** 0.25 IST
and **want** a few places. Sign and broadcast the offer.
After a few seconds, the UI should show the places.
