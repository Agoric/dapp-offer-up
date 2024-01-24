## Testing the contract (WIP)

```sh
cd contract
yarn  # may take a while
yarn test
```

```
yarn run v1.22.21
$ ava --verbose

start proposal module evaluating
bundles/ add: assetContract from /home/connolly/projects/dapp-offer-up/contract/src/offer-up.contract.js
  ✔ bundle-source › bundleSource() bundles the contract for use with zoe (1s)
    ℹ 7fffb45de65f0c887401d4a5c5185ad87d41e3842d6eb2e10559a06c747358fe0dc5ef41fd4c04457c5e9bb27ed85e48ea1ff8bdeac524063b7743205f4817e6
    ℹ Object @Alleged: BundleInstallation {}
bundles/ bundled 85 files in bundle-assetContract.js at 2024-01-23T02:30:57.437Z
startOfferUpContract()...
  ✔ contract › Install the contract
    ℹ Object @Alleged: BundleInstallation {}
  ✔ contract › Start the contract (901ms)
    ℹ terms: {
        tradePrice: {
          brand: Object @Alleged: PlayMoney brand {},
          value: 5n,
        },
      }
    ℹ Object @Alleged: InstanceHandle {}
CoreEval script: started contract Object [Alleged: InstanceHandle] {}
  ✔ contract › Alice trades: give some play money, want items (939ms)
    ℹ Object @Alleged: InstanceHandle {}
    ℹ Alice gives {
        Price: {
          brand: Object @Alleged: PlayMoney brand {},
          value: 5n,
        },
      }
    ℹ Alice payout brand Object @Alleged: Item brand {}
    ℹ Alice payout value Object @copyBag {
        payload: [
          [
            'scroll',
            1n,
          ],
          [
            'map',
            1n,
          ],
        ],
      }
CoreEval script: share via agoricNames: Object [Alleged: Item brand] {}
offerUp (re)started
----- OfferUp.2  2 trade give { Price: { brand: Object [Alleged: PlayMoney brand] {}, value: 5n } } want Object [copyBag] { payload: [ [ 'scroll', 1n ], [ 'map', 1n ] ] }
bundles/ add: centralSupply from /home/connolly/projects/dapp-offer-up/node_modules/@agoric/vats/src/centralSupply.js
bundles/ bundled 132 files in bundle-centralSupply.js at 2024-01-23T02:30:59.505Z
----- OfferUp.2  2 trade give {
  Price: { brand: Object [Alleged: ZDEFAULT brand] {}, value: 250000n }
} want Object [copyBag] { payload: [ [ 'scroll', 1n ], [ 'map', 1n ] ] }
  ✔ contract › Trade in IST rather than play money (2.5s)
    ℹ Alice gives {
        Price: {
          brand: Object @Alleged: ZDEFAULT brand {},
          value: 250000n,
        },
      }
    ℹ Alice payout brand Object @Alleged: Item brand {}
    ℹ Alice payout value Object @copyBag {
        payload: [
          [
            'scroll',
            1n,
          ],
          [
            'map',
            1n,
          ],
        ],
      }
  ✔ contract › use the code that will go on chain to start the contract (2.5s)
    ℹ Alice gives {
        Price: {
          brand: Object @Alleged: ZDEFAULT brand {},
          value: 250000n,
        },
      }
    ℹ Alice payout brand Object @Alleged: Item brand {}
    ℹ Alice payout value Object @copyBag {
        payload: [
          [
            'scroll',
            1n,
          ],
          [
            'map',
            1n,
          ],
        ],
      }
----- OfferUp.2  2 trade give {
  Price: { brand: Object [Alleged: ZDEFAULT brand] {}, value: 250000n }
} want Object [copyBag] { payload: [ [ 'scroll', 1n ], [ 'map', 1n ] ] }
  ─

  6 tests passed
Done in 4.74s.
```

Any `Error#1: changed ...` diagnostics are benign reports of updated files
outdating the contract bundle. It's benign: the test will re-build the bundle
as necessary.
