import { FormEvent, useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import agoricLogo from '/agoric.svg';
import mordorIcon from './assets/evil-tower.svg';
import shireIcon from './assets/hobbit-dwelling.svg';
import mistyMountainIcon from './assets/mountains.svg';
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

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const watcher = makeAgoricChainStorageWatcher(
  'http://localhost:26657',
  'agoriclocal'
);

interface CopyBag {
  payload: Array<[string, bigint]>;
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
  brands?: Array<[string, unknown]>;
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
        brands,
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
  const placeBrand = brands?.find(([name]) => name === 'Place')?.at(1);
  const istBrand = brands?.find(([name]) => name === 'IST')?.at(1);

  const value = makeCopyBag(Object.entries(wantChoices));
  const want = {
    Places: {
      brand: placeBrand,
      value,
    },
  };

  const give = { Price: { brand: istBrand, value: giveValue } };

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
  Mordor: mordorIcon,
  Shire: shireIcon,
  'Misty Mountains': mistyMountainIcon,
} as const;

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
  const [choices, setChoices] = useState<Record<string, bigint>>({
    Mordor: 1n,
    'Misty Mountains': 2n,
  });
  const [giveValue, setGiveValue] = useState(250000n);

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

  const changeChoice = (ev: FormEvent) => {
    if (!ev.target) return;
    const elt = ev.target as HTMLInputElement;
    const icon = elt.parentElement?.parentElement?.querySelector('img');
    const title = icon?.title;
    if (!title) return;
    const qty = BigInt(elt.value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [title]: _old, ...rest } = choices;
    const newChoices = qty > 0 ? { ...rest, [title]: qty } : rest;
    setChoices(newChoices);
  };

  const parseValue = (numeral: string, purse: Purse): bigint => {
    const { decimalPlaces } = purse.displayInfo;
    const num = Number(numeral) * 10 ** decimalPlaces;
    return BigInt(num);
  };

  return (
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
      <h1>Vite + React + Agoric</h1>
      <div className="card">
        <div>
          {wallet ? (
            <>
              <div>
                <small>
                  <code>{wallet.address}</code>
                </small>
              </div>
            </>
          ) : (
            <button onClick={tryConnectWallet}>Connect Wallet</button>
          )}
          <div style={{ textAlign: 'left' }}>
            {istPurse && (
              <div>
                <b>IST: </b>
                {stringifyAmountValue(
                  istPurse.currentAmount,
                  istPurse.displayInfo.assetKind,
                  istPurse.displayInfo.decimalPlaces
                )}
              </div>
            )}
            {wallet && (
              <div>
                <b>Places:</b>
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
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <table className="want">
          <thead>
            <tr>
              <th colSpan={2}>Give: IST</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input
                  type="number"
                  min="0"
                  value={
                    istPurse
                      ? stringifyAmountValue(
                          { ...istPurse.currentAmount, value: giveValue },
                          istPurse.displayInfo.assetKind,
                          istPurse.displayInfo.decimalPlaces
                        )
                      : Number(giveValue) / 1e6
                  }
                  onChange={ev =>
                    istPurse &&
                    setGiveValue(parseValue(ev?.target?.value, istPurse))
                  }
                  step="0.01"
                />
              </td>
            </tr>
          </tbody>
          <thead>
            <tr>
              <th colSpan={2}>Want: Places</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(nameToIcon).map(([title, icon]) => (
              <tr key={title}>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={Number(choices[title])}
                    step="1"
                    onChange={changeChoice}
                  />
                </td>
                <td>
                  <img className="piece" src={icon} title={title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <button onClick={() => makeOffer(giveValue, choices)}>
            Make Offer
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
