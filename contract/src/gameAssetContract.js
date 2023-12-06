/** @file Contract to mint and sell Place NFTs for a hypothetical game. */
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

const trace = makeTracer('Game', true);

/** @param {Amount<'copyBag'>} amt */
const bagValueSize = amt => {
  /** @type {[unknown, bigint][]} */
  const entries = getCopyBagEntries(amt.value); // XXX getCopyBagEntries returns any???
  const total = entries.reduce((acc, [_place, qty]) => acc + qty, 0n);
  return total;
};

/**
 * @param {ZCF<{joinPrice: Amount}>} zcf
 */
export const start = async zcf => {
  const { joinPrice } = zcf.getTerms();

  const { zcfSeat: gameSeat } = zcf.makeEmptySeatKit();
  const mint = await zcf.makeZCFMint('Place', AssetKind.COPY_BAG);

  const joinShape = harden({
    give: { Price: AmountShape },
    want: { Places: AmountShape },
    exit: M.any(),
  });

  /** @param {ZCFSeat} playerSeat */
  const joinHook = playerSeat => {
    const { give, want } = playerSeat.getProposal();
    trace('join', 'give', give, 'want', want.Places.value);

    AmountMath.isGTE(give.Price, joinPrice) ||
      Fail`${q(give.Price)} below joinPrice of ${q(joinPrice)}}`;

    bagValueSize(want.Places) <= 3n || Fail`only 3 places allowed when joining`;

    // We use the deprecated stage/reallocate API
    // so that we can test this with the version of zoe on mainnet1B.
    // using atomicRearrange bloated the contract from ~1MB to ~3BM
    playerSeat.decrementBy(gameSeat.incrementBy(give));
    const tmp = mint.mintGains(want);
    playerSeat.incrementBy(tmp.decrementBy(want));
    zcf.reallocate(playerSeat, tmp, gameSeat);

    playerSeat.exit(true);
    return 'welcome to the game';
  };

  const publicFacet = Far('API', {
    makeJoinInvitation: () =>
      zcf.makeInvitation(joinHook, 'join', undefined, joinShape),
  });

  return harden({ publicFacet });
};
harden(start);
