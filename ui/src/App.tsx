import { FormEvent, useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import agoricLogo from '/agoric.svg';
import scrollIcon from './assets/scroll.png';
import mapIcon from './assets/map.png';
import potionIcon from './assets/potionBlue.png';
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
import { stringifyAmountValue } from '@agoric/ui-components';
import { makeCopyBag } from '@agoric/store';

const { entries, fromEntries, keys, values } = Object;
const sum = (xs: bigint[]) => xs.reduce((acc, next) => acc + next, 0n);

const terms = {
  price: 250000n,
  maxItems: 3n,
};

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const watcher = makeAgoricChainStorageWatcher(
  'http://localhost:26657',
  'agoriclocal'
);

interface CopyBag<T = string> {
  payload: Array<[T, bigint]>;
}

interface Purse {
  brand: unknown;
  brandPetname: string;
  currentAmount: {
    brand: unknown;
    value: bigint | CopyBag;
  };
  displayInfo: {
    decimalPlaces: number;
    assetKind: unknown;
  };
}

interface AppState {
  wallet?: Wallet;
  gameInstance?: unknown;
  brands?: Record<string, unknown>;
  purses?: Array<Purse>;
}

const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    instances => {
      console.log('got instances', instances);
      useAppStore.setState({
        gameInstance: instances.find(([name]) => name === 'game1')!.at(1),
      });
    }
  );

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    brands => {
      console.log('Got brands', brands);
      useAppStore.setState({
        brands: fromEntries(brands),
      });
    }
  );
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher);
  useAppStore.setState({ wallet });
  const { pursesNotifier } = wallet;
  for await (const purses of subscribeLatest(pursesNotifier)) {
    console.log('got purses', purses);
    useAppStore.setState({ purses });
  }
};

const makeOffer = (giveValue: bigint, wantChoices: Record<string, bigint>) => {
  const { wallet, gameInstance, brands } = useAppStore.getState();
  if (!gameInstance) throw Error('no contract instance');
  if (!(brands && brands.IST && brands.Place))
    throw Error('brands not available');

  const value = makeCopyBag(entries(wantChoices));
  const want = { Places: { brand: brands.Place, value } };
  const give = { Price: { brand: brands.IST, value: giveValue } };

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: gameInstance,
      publicInvitationMaker: 'makeJoinInvitation',
    },
    { give, want },
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

const nameToIcon = {
  scroll: scrollIcon,
  map: mapIcon,
  potion: potionIcon,
} as const;
type ItemName = keyof typeof nameToIcon;
type ItemChoices = Partial<Record<ItemName, bigint>>;

const parseValue = (numeral: string, purse: Purse): bigint => {
  const { decimalPlaces } = purse.displayInfo;
  const num = Number(numeral) * 10 ** decimalPlaces;
  return BigInt(num);
};

function App() {
  useEffect(() => {
    setup();
  }, []);

  const { wallet, purses } = useAppStore(({ wallet, purses }) => ({
    wallet,
    purses,
  }));
  const istPurse = purses?.find(p => p.brandPetname === 'IST');
  const placesPurse = purses?.find(p => p.brandPetname === 'Place');

  const tryConnectWallet = () => {
    connectWallet().catch(err => {
      switch (err.message) {
        case 'KEPLR_CONNECTION_ERROR_NO_SMART_WALLET':
          alert(
            'no smart wallet at that address; try: yarn docker:make print-key'
          );
          break;
        default:
          alert(err.message);
      }
    });
  };

  const Logos = () => (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://agoric.com/develop" target="_blank">
          <img src={agoricLogo} className="logo agoric" alt="Agoric logo" />
        </a>
      </div>
    </>
  );

  const Inventory = () =>
    wallet &&
    istPurse && (
      <div className="card">
        <h3>My Wallet</h3>
        <div>
          <div>
            <small>
              <code>{wallet.address}</code>
            </small>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div>
              <b>IST: </b>
              {stringifyAmountValue(
                istPurse.currentAmount,
                istPurse.displayInfo.assetKind,
                istPurse.displayInfo.decimalPlaces
              )}
            </div>
            <div>
              <b>Items:</b>
              {placesPurse ? (
                <ul style={{ marginTop: 0, textAlign: 'left' }}>
                  {(placesPurse.currentAmount.value as CopyBag).payload.map(
                    ([name, number]) => (
                      <li key={name}>
                        {String(number)} {name}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                'None'
              )}
            </div>
          </div>
        </div>
      </div>
    );

  // XXX giveValue, choices state should be scoped to Trade component.
  const [giveValue, setGiveValue] = useState(terms.price);
  const renderGiveValue = (purse: Purse) => (
    <input
      type="number"
      min="0"
      value={stringifyAmountValue(
        { ...purse.currentAmount, value: giveValue },
        purse.displayInfo.assetKind,
        purse.displayInfo.decimalPlaces
      )}
      onChange={ev => setGiveValue(parseValue(ev?.target?.value, purse))}
      className={giveValue >= terms.price ? 'ok' : 'error'}
      step="0.01"
    />
  );

  const [choices, setChoices] = useState<ItemChoices>({ map: 1n, scroll: 2n });
  const changeChoice = (ev: FormEvent) => {
    if (!ev.target) return;
    const elt = ev.target as HTMLInputElement;
    const title = elt.title as ItemName;
    if (!title) return;
    const qty = BigInt(elt.value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [title]: _old, ...rest }: ItemChoices = choices;
    const newChoices = qty > 0 ? { ...rest, [title]: qty } : rest;
    setChoices(newChoices);
  };

  const WantPlaces = () => (
    <>
      <thead>
        <tr>
          <th colSpan={keys(nameToIcon).length}>Want: Choose up to 3 items</th>
        </tr>
      </thead>
      <tbody className="want">
        <tr>
          {entries(nameToIcon).map(([title, icon]) => (
            <td key={title}>
              <img className="piece" src={icon} title={title} />
            </td>
          ))}
        </tr>

        <tr>
          {keys(nameToIcon).map(title => (
            <td key={title}>
              <input
                title={title}
                type="number"
                min="0"
                max="3"
                value={Number(choices[title as ItemName])}
                step="1"
                onChange={changeChoice}
                className={
                  sum(values(choices)) <= terms.maxItems ? 'ok' : 'error'
                }
              />
              <br />
              {title}
            </td>
          ))}
        </tr>
      </tbody>
    </>
  );

  // TODO: don't wait for connect wallet to show Give.
  // IST displayInfo is available in vbankAsset or boardAux
  const Trade = () => (
    <>
      <table className="want">
        <WantPlaces />
        {istPurse && (
          <>
            <thead>
              <tr>
                <th colSpan={keys(nameToIcon).length}>
                  Give: Offer at least 0.25 IST
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td>{renderGiveValue(istPurse)}</td>
                <td>IST</td>
              </tr>
            </tbody>
          </>
        )}
      </table>
      <div>
        {wallet && (
          <button onClick={() => makeOffer(giveValue, choices)}>
            Make an Offer
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <Logos />
      <h1>Items Listed on Offer Up</h1>

      <div className="card">
        <Trade />
        <hr />
        {wallet ? (
          <Inventory />
        ) : (
          <button onClick={tryConnectWallet}>Connect Wallet</button>
        )}
      </div>
    </>
  );
}

export default App;
