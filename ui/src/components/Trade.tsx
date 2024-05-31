import { FormEvent, useState } from 'react';
import { stringifyAmountValue } from '@agoric/ui-components';
import scrollIcon from '../assets/scroll.png';
import istIcon from '../assets/IST.svg';
import mapIcon from '../assets/map.png';
import potionIcon from '../assets/potionBlue.png';

const { entries, values } = Object;
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

const Item = ({
  icon,
  coinIcon,
  label,
  value,
  onChange,
  inputClassName,
  inputStep,
  option,
}: {
  icon?: string;
  coinIcon?: string;
  label: string;
  value: number | string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  inputClassName: string;
  inputStep?: string;
  option: boolean;
}) => {
  let inputField;
  if (option) {
    inputField = (
      <input
        name="bid-option"
        title={label}
        type="radio"
        value={value}
        onChange={onChange}
        className={`trade-input ${inputClassName}`}
      />
    );
  } else {
    inputField = (
      <input
        title={label}
        type="number"
        min="0"
        max="3"
        value={value}
        step={inputStep || '1'}
        onChange={onChange}
        className={`trade-input ${inputClassName}`}
      />
    );
  }
  return (
    <div className="item-col">
      <label htmlFor={label}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </label>
      {icon && <img className="piece" src={icon} title={label} />}
      {coinIcon && <img className="coin" src={coinIcon} title={label} />}
      {inputField}
    </div>
  );
};

type TradeProps = {
  makeOffer: (giveValue: bigint, wantChoices: Record<string, bigint>) => void;
  istPurse: Purse;
  walletConnected: boolean;
};

// TODO: IST displayInfo is available in vbankAsset or boardAux
const Trade = ({ makeOffer, istPurse, walletConnected }: TradeProps) => {
  const [giveValue, setGiveValue] = useState(terms.price);
  const [choices, setChoices] = useState<ItemChoices>({ map: 1n });
  const changeChoice = (ev: FormEvent) => {
    if (!ev.target) return;
    const elt = ev.target as HTMLInputElement;
    const title = elt.title as ItemName;
    if (!title) return;
    const qty = BigInt(1);
    const newChoices = { [title]: qty };
    setChoices(newChoices);
  };

  return (
    <>
      <div className="trade">
        <h3>Want: Choose 1 item to bid on</h3>
        <div className="row-center">
          {entries(nameToIcon).map(([title, icon]) => (
            <Item
              key={title}
              icon={icon}
              value={Number(choices[title as ItemName] || 0n)}
              label={title}
              onChange={changeChoice}
              inputClassName={
                sum(values(choices)) <= terms.maxItems ? 'ok' : 'error'
              }
              option={true}
            />
          ))}
        </div>
      </div>
      <div className="trade">
        <h3>Give: Bid at least 0.25 IST</h3>
        <div className="row-center">
          <Item
            key="IST"
            coinIcon={istIcon}
            value={
              istPurse
                ? stringifyAmountValue(
                    { ...istPurse.currentAmount, value: giveValue },
                    istPurse.displayInfo.assetKind,
                    istPurse.displayInfo.decimalPlaces,
                  )
                : '0.25'
            }
            label="IST"
            onChange={ev =>
              setGiveValue(parseValue(ev?.target?.value, istPurse))
            }
            inputClassName={giveValue >= terms.price ? 'ok' : 'error'}
            inputStep="0.01"
            option={false}
          />
        </div>
      </div>
      <div>
        {walletConnected && (
          <button onClick={() => makeOffer(giveValue, choices)}>
            Place Bid
          </button>
        )}
      </div>
    </>
  );
};

export { Trade };
