/**
 * @file Contract to mint and sell a few Item NFTs at a time.
 *
 * We declare variables (including functions) before using them,
 * so you may want to skip ahead and come back to some details.
 * @see {start} for the main contract entrypoint
 *
 * As is typical in Zoe contracts, the flow is:
 *   1. contract does internal setup and returns public / creator facets.
 *   2. client uses a public facet method -- {@link makeTradeInvitation} in this case --
 *      to make an invitation.
 *   3. client makes an offer using the invitation, along with
 *      a proposal (with give and want) and payments. Zoe escrows the payments, and then
 *   4. Zoe invokes the offer handler specified in step 2 -- here {@link tradeHandler}.
 *
 * @see {@link https://docs.agoric.com/guides/zoe/|Zoe Overview} for a walk-thru of this contract
 * @see {@link https://docs.agoric.com/guides/js-programming/hardened-js.html|Hardened JavaScript}
 * for background on `harden` and `assert`.
 */
// @ts-check

import { Far } from '@endo/far';
import { M, getCopyBagEntries } from '@endo/patterns';
import { AssetKind, AmountMath } from '@agoric/ertp/src/amountMath.js';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import {
  atomicRearrange,
  atomicTransfer,
} from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';
import {
  withdrawFromSeat,
  depositToSeat,
} from '@agoric/zoe/src/contractSupport/index.js';

const { Fail, quote: q } = assert;

// Added for debugging/console.log
const bigintReplacer = (key, value) =>
  typeof value === 'bigint' ? value.toString() : value;

// #region bag utilities
/** @type { (xs: bigint[]) => bigint } */
const sum = xs => xs.reduce((acc, x) => acc + x, 0n);

/**
 * @param {import('@endo/patterns').CopyBag} bag
 * @returns {bigint[]}
 */
const bagCounts = bag => {
  const entries = getCopyBagEntries(bag);
  return entries.map(([_k, ct]) => ct);
};
// #endregion

/**
 * In addition to the standard `issuers` and `brands` terms,
 * this contract is parameterized by terms for price and,
 * optionally, a maximum number of items sold for that price (default: 3).
 *
 * @typedef {{
 *   tradePrice: Amount;
 *   maxItems?: bigint;
 * }} OfferUpTerms
 */

export const meta = {
  customTermsShape: M.splitRecord(
    { tradePrice: AmountShape },
    { maxItems: M.bigint() },
  ),
};

const isObject = object => {
  return object != null && typeof object === 'object';
};
const isDeepEqual = (object1, object2) => {
  const objKeys1 = Object.keys(object1);
  const objKeys2 = Object.keys(object2);

  if (objKeys1.length !== objKeys2.length) return false;

  for (var key of objKeys1) {
    const value1 = object1[key];
    const value2 = object2[key];

    const isObjects = isObject(value1) && isObject(value2);

    if (
      (isObjects && !isDeepEqual(value1, value2)) ||
      (!isObjects && value1 !== value2)
    ) {
      return false;
    }
  }
  return true;
};

// compatibility with an earlier contract metadata API
export const customTermsShape = meta.customTermsShape;

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Items, and
 *   - handles offers to buy up to `maxItems` items at a time.
 *
 * @param {ZCF<OfferUpTerms>} zcf
 */
export const start = async zcf => {
  const { tradePrice, maxItems = 1n } = zcf.getTerms();

  /**
   * a new ERTP mint for items, accessed thru the Zoe Contract Facet.
   * Note: `makeZCFMint` makes the associated brand and issuer available
   * in the contract's terms.
   *
   * AssetKind.COPY_BAG can express non-fungible (or rather: semi-fungible)
   * amounts such as: 3 potions and 1 map.
   */
  const itemMint = await zcf.makeZCFMint('Item', AssetKind.COPY_BAG);
  const { brand: itemBrand } = itemMint.getIssuerRecord();

  /**
   * a pattern to constrain proposals given to {@link tradeHandler}
   *
   * The `Price` amount must be >= `tradePrice` term.
   * The `Items` amount must use the `Item` brand and a bag value.
   */
  const proposalShape = harden({
    give: { Price: M.gte(tradePrice) },
    // want: { Items: { brand: itemBrand, value: M.bag() } },
    want: {},
    exit: M.any(),
  });

  /** a seat for allocating proceeds of sales */
  const proceeds = zcf.makeEmptySeatKit().zcfSeat;
  let bidsRegister = new Map();
  let currentNumOfBids = 0;
  const maxBids = 3;

  /** @type {OfferHandler} */
  const tradeHandler = (buyerSeat, offerArgs) => {
    // give and want are guaranteed by Zoe to match proposalShape
    const { give } = buyerSeat.getProposal();
    const { want } = offerArgs;
    // const { offerArgs } = buyerSeat.getOfferArgs();

    sum(bagCounts(want.Items.value)) <= maxItems ||
      Fail`max ${q(maxItems)} items allowed: ${q(want.Items)}`;

    // atomicRearrange(
    //   zcf,
    //   harden([
    //     // price from buyer to proceeds
    //     [buyerSeat, proceeds, { Price: give.Price }],
    //   ]),
    // );

    ++currentNumOfBids;
    // const buyerKey = Date.now().toString();
    bidsRegister.set(currentNumOfBids.toString(), {
      buyerSeat,
      bidValue: give.Price,
    });

    console.log(
      `New offer received: ${JSON.stringify(
        give.Price,
        bigintReplacer,
      )} ${JSON.stringify(bidsRegister, bigintReplacer)}`,
    );

    // bidsRegister.forEach((value, key) => {
    //   console.log(`Bids Register holds following data values : ${value}`);
    // });

    if (currentNumOfBids == maxBids) {
      
      currentNumOfBids = 0;
      // Find maximum bids - if there are multiple bids with maximum value, the first one is picked.
      let maxBidValue = harden({ ...give.Price });
      // let maxBidValue = give.Price;
      let buyerSeat;
      bidsRegister.forEach(value => {
        // We need to use Amount.isGTE instead
        if (AmountMath.isGTE(value.bidValue, maxBidValue)) {
          maxBidValue = value.bidValue;
          buyerSeat = value.buyerSeat;
        }
      });
      const newItems = itemMint.mintGains(want);
      atomicRearrange(zcf, harden([
        [newItems, buyerSeat, want],
        [buyerSeat, proceeds, {Price: maxBidValue}]
      ]));
      newItems.exit();
      buyerSeat.exit(true);

      bidsRegister.forEach(async value => {
        if ( !value.buyerSeat.hasExited() ) {
          
          value.buyerSeat.exit(true);
        }
      });
      bidsRegister.clear();
    }

    // buyerSeat.exit(true);

    return 'trade complete';
  };

  /**
   * Make an invitation to trade for items.
   *
   * Proposal Keywords used in offers using these invitations:
   *   - give: `Price`
   *   - want: `Items`
   */
  const makeTradeInvitation = () =>
    zcf.makeInvitation(tradeHandler, 'buy items', undefined, proposalShape);

  // Mark the publicFacet Far, i.e. reachable from outside the contract
  const publicFacet = Far('Items Public Facet', {
    makeTradeInvitation,
  });
  return harden({ publicFacet });
};
harden(start);
