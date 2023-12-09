## Testing the contract (WIP)

```sh
cd contract
yarn  # may take a while
yarn test
```

```
$ yarn test
yarn run v1.22.19
$ ava --verbose

  ✔ bundle-source › bundleSource() bundles the contract for use with zoe (3.3s)
    ...
  ✔ contract › Install the contract
    ℹ Object @Alleged: BundleInstallation {}
  ✔ contract › Start the contract (1.3s)
    ...
  ✔ contract › Alice trades: give some play money, want some game places (1.3s)
    ℹ Object @Alleged: InstanceHandle {}
    ℹ Alice gives {
        Price: {
          brand: Object @Alleged: PlayMoney brand {},
          value: 5n,
        },
      }
    ℹ Alice payout brand Object @Alleged: Place brand {}
    ℹ Alice payout value Object @copyBag {
        payload: [
          [
            'Park Place',
            1n,
          ],
          [
            'Boardwalk',
            1n,
          ],
        ],
      }
  ✔ contract › Trade in IST rather than play money (8.5s)
    ...
  ✔ contract › use the code that will go on chain to start the contract (8.5s)
    ...

  ─

  6 tests passed
Done in 12.74s.
```

Any `Error#1: changed ...` diagnostics are benign reports of updated files
outdating the contract bundle. It's benign: the test will re-build the bundle
as necessary.
