import { useEffect, useState } from 'react';

import './App.css';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import { create } from 'zustand';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { subscribeLatest } from '@agoric/notifier';
import { makeCopyBag } from '@agoric/store';
import { Logos } from './components/Logos';
import { Inventory } from './components/Inventory';
import { Trade } from './components/Trade';
import OfferTile from './components/OfferTile';

const { entries, fromEntries } = Object;

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

interface AppState {
  wallet?: Wallet;
  realEstateInstance?: unknown;
  brands?: Record<string, unknown>;
  purses?: Array<Purse>;
  offers?: { [key: string]: object };
}

const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    instances => {
      console.log('got instances', instances);
      useAppStore.setState({
        realEstateInstance: instances
          .find(([name]) => name === 'realEstate')!
          .at(1),
      });
    },
  );

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    brands => {
      console.log('Got brands', brands);
      useAppStore.setState({
        brands: fromEntries(brands),
      });
    },
  );
  watcher.watchLatest<{ [key: string]: object }>(
    [Kind.Data, 'published.realEstate.offers'],
    offers => {
      console.log('Got offers', offers);
      useAppStore.setState({
        offers: offers,
      });
    },
  );
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });
  const { pursesNotifier } = wallet;
  for await (const purses of subscribeLatest(pursesNotifier)) {
    console.log('got purses', purses);
    useAppStore.setState({ purses });
  }
};
const BUY = 1;
const SELL = 0;
const makeOffer = (
  offerType: number,
  selectedBrand: string,
  giveValue: bigint,
  wantValue: bigint,
  offerArgs: { userAddress?: string; propertyName: string; sell?: boolean },
) => {
  const { wallet, realEstateInstance, brands } = useAppStore.getState();
  if (!realEstateInstance) throw Error('no contract instance');
  if (!(brands && brands.IST && brands[selectedBrand]))
    throw Error('brands not available');

  const wantBrand = offerType === SELL ? brands.IST : brands[selectedBrand];
  const giveBrand = offerType === SELL ? brands[selectedBrand] : brands.IST;
  const want = {
    WantAsset: { brand: wantBrand, value: wantValue },
  };
  const give = {
    GiveAsset: { brand: giveBrand, value: giveValue },
  };

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: realEstateInstance,
      publicInvitationMaker: 'makeTradeInvitation',
    },
    { give, want },
    offerArgs,
    (update: { status: string; data?: unknown }) => {
      console.log('update', update);
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Offer rejected');
      }
    },
  );
};

function App() {
  const brands = {
    PlayProperty_0: 'Condos',
    PlayProperty_1: 'Villas',
    PlayProperty_2: 'Apartments',
    PlayProperty_3: 'House',
  };

  const [selectedBrand, setSelectedBrand] = useState<string>(
    Object.keys(brands)[0],
  );
  const [istToDemand, setIstToDemand] = useState<number>();
  const [propertyToSell, setPropertyToSell] = useState<number>();

  const [istToSell, setIstToSell] = useState<number>();
  const [propertyToDemand, setPropertyToDemand] = useState<number>();

  useEffect(() => {
    setup();
  }, []);

  const { wallet, purses } = useAppStore(({ wallet, purses }) => ({
    wallet,
    purses,
  }));
  const istPurse = purses?.find(p => p.brandPetname === 'IST');
  const playPropertyPurses = purses
    ?.filter(p => p.brandPetname.startsWith('PlayProperty_'))
    .reduce((acc, next) => ({ ...acc, [next.brandPetname]: next }), {});
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

  return (
    <>
      <button onClick={tryConnectWallet}>
        {wallet?.address ?? 'Connect Wallet'}
      </button>
      <button
        onClick={() =>
          makeOffer(BUY, selectedBrand, 0n, 100n, {
            userAddress: 'Creator_Address',
            propertyName: selectedBrand,
          })
        }
      >
        Extract
      </button>
      <div
        style={{
          display: 'flex',
        }}
      >
        <div
          style={{
            flex: 1,
            margin: `10px`,
          }}
        >
          <h2>Select Property</h2>
          {Object.entries(brands).map(([brand, petName]) => {
            return (
              <div
                style={{
                  backgroundColor:
                    selectedBrand === brand ? 'gray' : 'transparent',
                }}
                onClick={() => setSelectedBrand(brand)}
              >
                {petName}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            margin: `10px`,
          }}
        >
          <h2>Sell Property</h2>
          <span style={{ display: 'flex' }}>
            <input
              style={{ width: '-webkit-fill-available' }}
              type="number"
              placeholder="property to sell"
              value={propertyToSell}
              onChange={e => setPropertyToSell(Number(e.target.value))}
            />
            <span
              style={{ marginLeft: '10px', textWrap: 'nowrap', fontSize: 12 }}
            >
              Property available:
              {playPropertyPurses?.[
                selectedBrand
              ]?.currentAmount.value.toString() || 0}
            </span>
          </span>
          <span style={{ display: 'flex' }}>
            <input
              style={{ width: '-webkit-fill-available' }}
              type="number"
              placeholder="ist to demand"
              value={istToDemand}
              onChange={e => setIstToDemand(Number(e.target.value))}
            />

            <span
              style={{ marginLeft: '10px', textWrap: 'nowrap', fontSize: 12 }}
            >
              IST available: {istPurse?.currentAmount.value.toString() || 0}
            </span>
          </span>
          <button
            onClick={() =>
              makeOffer(
                SELL,
                selectedBrand,
                BigInt(propertyToSell || 0),
                BigInt(istToDemand || 0),
                {
                  propertyName: selectedBrand,
                  sell: true,
                },
              )
            }
          >
            Submit offer
          </button>
        </div>
        <div
          style={{
            flex: 1,
            margin: `10px`,
          }}
        >
          <h2>Offers</h2>
          {/* <OfferTile /> */}
          <span style={{ display: 'flex' }}>
            <input
              style={{ width: '-webkit-fill-available' }}
              type="number"
              placeholder="property to demand"
              value={propertyToDemand}
              onChange={e => setPropertyToDemand(Number(e.target.value))}
            />
            <span
              style={{ marginLeft: '10px', textWrap: 'nowrap', fontSize: 12 }}
            >
              Property available:
              {playPropertyPurses?.[
                selectedBrand
              ]?.currentAmount.value.toString() || 0}
            </span>
          </span>
          <span style={{ display: 'flex' }}>
            <input
              style={{ width: '-webkit-fill-available' }}
              type="number"
              placeholder="ist to give"
              value={istToSell}
              onChange={e => setIstToSell(Number(e.target.value))}
            />

            <span
              style={{ marginLeft: '10px', textWrap: 'nowrap', fontSize: 12 }}
            >
              IST available: {istPurse?.currentAmount.value.toString() || 0}
            </span>
          </span>
          <button
            onClick={() =>
              makeOffer(
                BUY,
                selectedBrand,
                BigInt(istToSell || 0),
                BigInt(propertyToDemand || 0),
                {
                  propertyName: selectedBrand,
                },
              )
            }
          >
            Submit offer
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
