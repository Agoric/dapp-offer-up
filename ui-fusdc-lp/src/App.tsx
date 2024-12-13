import { AmountMath } from '@agoric/ertp';
import type { PoolMetrics } from '@agoric/fast-usdc/src/types.ts';
import { subscribeLatest } from '@agoric/notifier';
import { AgoricProvider } from '@agoric/react-components';
import '@agoric/react-components/dist/style.css';
import {
  AgoricChainStoragePathKind as Kind,
  makeAgoricChainStorageWatcher,
} from '@agoric/rpc';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.d.ts';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import {
  ceilDivideBy,
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { ThemeProvider, useTheme } from '@interchain-ui/react';
import { wallets } from 'cosmos-kit';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import Dashboard from './components/Dashboard';
import { Navbar } from './components/Navbar';
import './index.css';

// XXX import type { USDCProposalShapes } from '@agoric/fast-usdc/src/types.ts';
type USDCProposalShapes = {
  deposit: {
    give: { USDC: Amount<'nat'> };
    want?: { PoolShare: Amount<'nat'> };
  };
  withdraw: {
    give: { PoolShare: Amount<'nat'> };
    want: { USDC: Amount<'nat'> };
  };
};
type PurseRecord = CurrentWalletRecord['purses'];

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const { fromEntries } = Object;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');
interface AppState {
  wallet?: Wallet;
  fusdcInstance?: unknown;
  brands?: Record<string, Brand>;
  purses?: Array<PurseRecord>;
  metrics?: Record<string, unknown>;
}
const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    pairs => {
      const instances = fromEntries(pairs);
      console.log('got instances', instances);
      useAppStore.setState({
        fusdcInstance: instances.fastUsdc,
      });
    }
  );

  watcher.watchLatest<Array<[string, Brand]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    pairs => {
      const brands = fromEntries(pairs);
      console.log('Got brands', brands);
      useAppStore.setState({ brands });
    }
  );

  watcher.watchLatest<Array<[string, PoolMetrics]>>(
    [Kind.Data, 'published.fastUsdc.poolMetrics'],
    metrics => {
      console.log('Got metrics', metrics);
      useAppStore.setState({
        metrics: { ...metrics },
      });
    }
  );
};

const parseUSDCAmount = (numeral: string, usdc: Brand): Amount<'nat'> => {
  const USDC_DECIMALS = 6;
  const unit = AmountMath.make(usdc, 10n ** BigInt(USDC_DECIMALS));
  return multiplyBy(unit, parseRatio(numeral, usdc));
};

const connectWallet = async () => {
  const info = await suggestChain('https://local.agoric.net/network-config');
  console.log('connectWallet: chain info', info);
  const wallet = await makeAgoricWalletConnection(watcher, info.rpc);
  useAppStore.setState({ wallet });
  console.log('wallet', wallet);
  const { pursesNotifier } = wallet;
  for await (const purses of subscribeLatest<PurseRecord[]>(pursesNotifier)) {
    console.log('got purses', purses);
    useAppStore.setState({ purses });
  }
};

const makeDepositOffer = () => {
  const { wallet, fusdcInstance, brands } = useAppStore.getState();
  if (!fusdcInstance) throw Error('no contract instance');
  if (!(brands && brands.USDC)) throw Error('brands not available');
  const proposal: USDCProposalShapes['deposit'] = {
    give: { USDC: parseUSDCAmount('10', brands.USDC) },
  };
  const depositSpec: OfferSpec = {
    id: 'unused',
    invitationSpec: {
      source: 'contract',
      instance: fusdcInstance,
      publicInvitationMaker: 'makeDepositInvitation',
    },
    proposal,
  };
  console.log('about to make offer', wallet, depositSpec);
  wallet?.makeOffer(
    depositSpec.invitationSpec,
    depositSpec.proposal,
    undefined,
    (update: { status: string; data?: unknown }) => {
      console.log('@@@@offer update', update);
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
