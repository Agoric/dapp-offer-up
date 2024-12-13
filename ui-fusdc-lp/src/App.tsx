import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import {
  multiplyBy,
  parseRatio,
  ceilDivideBy,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { AmountMath } from '@agoric/ertp';
import { create } from 'zustand';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { subscribeLatest } from '@agoric/notifier';
import { AgoricProvider } from '@agoric/react-components';
import { wallets } from 'cosmos-kit';
import { ThemeProvider, useTheme } from '@interchain-ui/react';
import './index.css';
import '@agoric/react-components/dist/style.css';
import { Navbar } from './components/Navbar';
import Dashboard from './components/Dashboard';
import { useEffect, useState } from 'react';

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');
interface AppState {
  wallet?: Wallet;
  fusdcInstance?: unknown;
  brands?: Record<string, unknown>;
  purses?: Array<Purse>;
  metrics?: Record<string, unknown>;
}
const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    instances => {
      console.log('got instances', instances);
      useAppStore.setState({
        fusdcInstance: instances.find(([name]) => name === 'fastUsdc')!.at(1),
      });
    }
  );

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    brands => {
      console.log('Got brands', brands);
      useAppStore.setState({
        brands: Object.fromEntries(brands),
      });
    }
  );

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.fastUsdc.poolMetrics'],
    metrics => {
      console.log('Got metrics', metrics);
      useAppStore.setState({
        metrics: { ...metrics },
      });
    }
  );
};
const parseUSDCAmount = (amountString, usdc) => {
  const USDC_DECIMALS = 6;
  const unit = AmountMath.make(usdc, 10n ** BigInt(USDC_DECIMALS));
  return multiplyBy(unit, parseRatio(amountString, usdc));
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });
  console.log('wallet', wallet);
  const { pursesNotifier } = wallet;
  for await (const purses of subscribeLatest<Purse[]>(pursesNotifier)) {
    console.log('got purses', purses);
    useAppStore.setState({ purses });
  }
};

const makeDepositOffer = () => {
  const { wallet, fusdcInstance, brands } = useAppStore.getState();
  if (!fusdcInstance) throw Error('no contract instance');
  if (!(brands && brands.USDC)) throw Error('brands not available');
  const proposal = {
    give: {
      USDC: parseUSDCAmount('10', brands.USDC),
    },
  };
  console.log('about to make offer', wallet);
  wallet?.makeOffer(
    {
      source: 'agoricContract',
      instance: fusdcInstance,
      callPipe: [['makeDepositInvitation', []]],
    },
    proposal,
    undefined,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Offer rejected');
      }
    }
  );
};

const makeWithdrawOffer = () => {
  const { wallet, fusdcInstance, brands, metrics } = useAppStore.getState();
  if (!fusdcInstance) throw Error('no contract instance');
  if (!(brands && brands.USDC && brands.FastLP))
    throw Error('brands not available');
  if (!(metrics && metrics.shareWorth)) throw Error('metrics not available');

  const usdcAmount = parseUSDCAmount('10', brands.USDC);
  const fastLPAmount = ceilDivideBy(usdcAmount, metrics.shareWorth);
  const proposal = {
    give: {
      PoolShare: fastLPAmount,
    },
    want: {
      USDC: usdcAmount,
    },
  };
  console.log('fastLPAmount', fastLPAmount);
  console.log('about to make withdraw offer');
  wallet?.makeOffer(
    {
      source: 'agoricContract',
      instance: fusdcInstance,
      callPipe: [['makeWithdrawInvitation', []]],
    },
    proposal,
    undefined,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Offer rejected');
      }
    }
  );
};

function App() {
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  useEffect(() => {
    setup();
  }, []);
  const tryConnectWallet = () => {
    connectWallet().catch(err => {
      switch (err.message) {
        case 'KEPLR_CONNECTION_ERROR_NO_SMART_WALLET':
          alert('no smart wallet at that address');
          break;
        default:
          alert(err.message);
      }
    });
  };
  const { themeClass } = useTheme();
  return (
    <ThemeProvider>
      <div className={themeClass}>
        <AgoricProvider
          wallets={wallets.extension}
          agoricNetworkConfigs={[
            {
              testChain: {
                chainId: 'agoriclocal',
                chainName: 'agoric-local',
              },
              apis: {
                rest: ['http://localhost:1317'],
                rpc: ['http://localhost:26657'],
              },
            },
          ]}
          defaultChainName="agoric-local"
        >
          <Navbar onConnectClick={tryConnectWallet} />
          <Dashboard
            makeDepositOffer={makeDepositOffer}
            makeWithdrawOffer={makeWithdrawOffer}
          />
        </AgoricProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
