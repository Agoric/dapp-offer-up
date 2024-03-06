import { subscribeLatest } from '@agoric/notifier';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';

export const ENDPOINTS = {
  RPC: 'http://138.197.111.149:26657',
  API: 'http://138.197.111.149:1317',
};
export const watcher = makeAgoricChainStorageWatcher(
  ENDPOINTS.API,
  'agoriclocal',
);
export type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const { fromEntries } = Object;
export const getAgoricInstance = async (instance: string) => {
  return new Promise(resolve => {
    watcher.watchLatest<Array<[string, unknown]>>(
      [Kind.Data, 'published.agoricNames.instance'],
      instances => {
        const agoricInstance = instances
          .find(([name]) => name === instance)!
          .at(1);
        resolve(agoricInstance);
      },
    );
  });
};

export const getBrands = async () => {
  return new Promise<Record<string, unknown>>(resolve => {
    watcher.watchLatest<Array<[string, unknown]>>(
      [Kind.Data, 'published.agoricNames.brand'],
      brands => {
        resolve(fromEntries(brands));
      },
    );
  });
};
export const connectWallet = async () => {
  const walletpurses: Array<Purse> = [];
  try {
    await suggestChain('https://local.agoric.net/network-config');
    const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
    //   useAppStore.setState({ wallet });
    const { pursesNotifier } = wallet;
    for await (const purses of subscribeLatest(pursesNotifier)) {
      console.log('got purses', purses);
      walletpurses.push(purses);
      // useAppStore.setState({ purses });
    }
    return { wallet, walletpurses };
  } catch (err) {
    console.error('Error connecting wallet', err);
    // Re-throw or return a default value in case of error
    throw err; // Option 1: Re-throw so caller can handle
    // return { wallet: null, walletPurses: [] }; // Option 2: Return default
  }
};
