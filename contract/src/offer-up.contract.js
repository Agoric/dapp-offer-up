/** @file Contract to mint and sell Item NFTs. */
// @ts-check

import { Far } from '@endo/far';
import { M, getCopyBagEntries } from '@endo/patterns';
import { AmountMath, AssetKind } from '@agoric/ertp/src/amountMath.js';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
// Use the deprecated atomicRearrange API
// for compatibility with mainnet1B.
import '@agoric/zoe/exported.js';

import { makeTracer } from './debug.js';

const { Fail, quote: q } = assert;

const trace = makeTracer('OfferUp', true);

/** @param {Amount<'copyBag'>} amt */
const bagValueSize = amt => {
  /** @type {[unknown, bigint][]} */
  const entries = getCopyBagEntries(amt.value); // XXX getCopyBagEntries returns any???
  const total = entries.reduce((acc, [_, qty]) => acc + qty, 0n);
  return total;
};

/**
 * @param {ZCF<{tradePrice: Amount}>} zcf
 */
export const start = async zcf => {
  const { tradePrice } = zcf.getTerms();

  const { zcfSeat: proceeds } = zcf.makeEmptySeatKit();
  const mint = await zcf.makeZCFMint('Item', AssetKind.COPY_BAG);

  const tradeShape = harden({
    give: { Price: AmountShape },
    want: { Items: AmountShape },
    exit: M.any(),
  });

  /** @param {ZCFSeat} buyerSeat */
  const tradeHandler = buyerSeat => {
    const { give, want } = buyerSeat.getProposal();
    trace('trade', 'give', give, 'want', want.Items.value);

    AmountMath.isGTE(give.Price, tradePrice) ||
      Fail`${q(give.Price)} below required ${q(tradePrice)}}`;

    bagValueSize(want.Items) <= 3n || Fail`only 3 items allowed in a trade`;

    // We use the deprecated stage/reallocate API
    // so that we can test this with the version of zoe on mainnet1B.
    // using atomicRearrange bloated the contract from ~1MB to ~3BM
    buyerSeat.decrementBy(proceeds.incrementBy(give));
    const tmp = mint.mintGains(want);
    buyerSeat.incrementBy(tmp.decrementBy(want));
    zcf.reallocate(buyerSeat, tmp, proceeds);

    buyerSeat.exit(true);
    return 'trade complete';
  };

  const publicFacet = Far('API', {
    makeTradeInvitation: () =>
      zcf.makeInvitation(tradeHandler, 'trade', undefined, tradeShape),
  });

  return harden({ publicFacet });
};
harden(start);
