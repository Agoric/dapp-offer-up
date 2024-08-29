# Agoric Dapp Starter: Offer Up

Offer Up is a simple Dapp for the [Agoric smart contract platform](https://docs.agoric.com/) that permits users to explore items for sale in a marketplace, displaying default options of maps, potions, and scrolls. Users can select up to three items in any combination, create an offer starting from 0.25 [IST](https://agoric.com/blog/getting-started/ist), and upon transaction confirmation, receive the chosen items in their wallet while the offered amount is deducted from their balance.

<div style="display: flex; align-items: center; justify-content: center; height: 300;">
    <img src="https://docs.agoric.com/assets/new_002_small2.DgAL2zV8.png" alt="Offer Up Dapp" style="display: block; margin: auto;">
</div>

## Getting started

Detailed instructions regarding setting up the environment with a video walkthrough is available at [Your First Agoric Dapp](https://docs.agoric.com/guides/getting-started/) tutorial. But if you have the environment set, i.e., have correct version of node, yarn, docker, and Keplr wallet installed, below are the steps that you need to follow. *You can also use the same instructions to follow along in Github Codespaces without any installation or downloads on your local machine, apart from Keplr which is needed to connect to dApp.*
- run the `yarn install` command to install any solution dependencies. *Downloading all the required dependencies may take several minutes. The UI depends on the React framework, and the contract depends on the Agoric framework. The packages in this project also have development dependencies for testing, code formatting, and static analysis.*
- start a local Agoric blockchain using the `yarn start:docker` command.
- run `yarn docker:logs` to check the logs. Once your logs resemble the following, stop the logs by pressing `ctrl+c`.
```
demo-agd-1  | 2023-12-27T04:08:06.384Z block-manager: block 1003 begin
demo-agd-1  | 2023-12-27T04:08:06.386Z block-manager: block 1003 commit
demo-agd-1  | 2023-12-27T04:08:07.396Z block-manager: block 1004 begin
demo-agd-1  | 2023-12-27T04:08:07.398Z block-manager: block 1004 commit
demo-agd-1  | 2023-12-27T04:08:08.405Z block-manager: block 1005 begin
demo-agd-1  | 2023-12-27T04:08:08.407Z block-manager: block 1005 commit
```
- **Only if you are running this in a github codespace:** go to `PORTS` in bottom-right panel, and make all listed ports `public` by selecting `Port Visibility` after right-click.
- run `yarn start:contract` to start the smart contract. 
- run `yarn start:ui` to start the smart contract. You can use the link in the output to load the smart contract UI in a browser.

For any troubleshooting please refer to the detailed tutorial at [Here](https://docs.agoric.com/guides/getting-started/).

## Testing

To run the unit test:
- run `yarn test` to run the unit tests

To run the end to end test:
- run `yarn test:e2e --browser chrome` to run the end to end tests; you may replace `chrome` with your favorite browser name. Although `chrome` is the recommended browser to run end to end tests at this point.


## Contributing

See [CONTRIBUTING](./CONTRIBUTING.md) for more on contributing to this repo.
