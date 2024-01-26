import { FormEvent, useState } from 'react';
import { stringifyAmountValue } from '@agoric/ui-components';
import scrollIcon from '../assets/scroll.png';
import mapIcon from '../assets/map.png';
import potionIcon from '../assets/potionBlue.png';

const { entries, keys, values } = Object;
const sum = (xs: bigint[]) => xs.reduce((acc, next) => acc + next, 0n);

const terms = {
  price: 250000n,
  maxItems: 3n,
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

type TradeProps = {
  makeOffer: (giveValue: bigint, wantChoices: Record<string, bigint>) => void;
  istPurse: Purse;
  walletConnected: boolean;
};

// TODO: don't wait for connect wallet to show Give.
// IST displayInfo is available in vbankAsset or boardAux
const Trade = ({ makeOffer, istPurse, walletConnected }: TradeProps) => {
  const [giveValue, setGiveValue] = useState(terms.price);
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

  const renderGiveValue = (purse: Purse) => (
    <input
      type="number"
      min="0"
      value={stringifyAmountValue(
        { ...purse.currentAmount, value: giveValue },
        purse.displayInfo.assetKind,
        purse.displayInfo.decimalPlaces,
      )}
      onChange={ev => setGiveValue(parseValue(ev?.target?.value, purse))}
      className={giveValue >= terms.price ? 'ok' : 'error'}
      step="0.01"
    />
  );

  const WantItems = () => (
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

  return (
    <>
      <table className="want">
        <WantItems />
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
        {walletConnected && (
          <button onClick={() => makeOffer(giveValue, choices)}>
            Make an Offer
          </button>
        )}
      </div>
    </>
  );
};

export { Trade };
