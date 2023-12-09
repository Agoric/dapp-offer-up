# Agoric App Starter: Simple Game

This is a simple app for the [Agoric smart contract platform](https://docs.agoric.com/).

<img alt="Vite + React + Agoric page with Connect Wallet button"
style="border: 1px solid" width="300"
src="https://github.com/Agoric/documentation/assets/150986/36a87384-0148-4f9e-8606-e176bd7880b3" />

The contract lets you give a small amount of [IST](https://inter.trade/) in exchange for
a few NFTs that represent places in a hypothetical game.

The UI is a React app started with the [vite](https://vitejs.dev/) `react-ts` template.
On top of that, we add

- Watching [blockchain state queries](https://docs.agoric.com/guides/getting-started/contract-rpc.html#querying-vstorage)
- [Signing and sending offers](https://docs.agoric.com/guides/getting-started/contract-rpc.html#signing-and-broadcasting-offers)

## Getting started

First get set up with [README-local-chain](./README-local-chain.md).

The deploy the contract:

```sh
yarn start:contract
```

Use the key material to set up an account in Keplr.

Start the UI:

```sh
cd ui
yarn
yarn dev
```

Then hit **Connect Wallet**. The UI should show your address.

Then **Make Offer**. Keplr should show an offer to **give** 0.25 IST
and **want** a few places. Sign and broadcast the offer.
After a few seconds, the UI should show the places.

## Testing, Development

See [CONTRIBUTING](./CONTRIBUTING.md).
