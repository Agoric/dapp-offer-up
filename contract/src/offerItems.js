/**
 * @file Contract to mint and sell a few Item NFTs at a time.
 *
 * We declare variables (including functions) before using them,
 * so you may want to skip ahead and come back to some details.
 * @see {start} for the main contract entrypoint
 *
 * @see {@link https://docs.agoric.com/guides/zoe/|Zoe Overview} for a walk-thru of this contract
 * @see {@link https://docs.agoric.com/guides/js-programming/hardened-js.html|Hardened JavaScript}
 * for background on `harden` and `assert`.
 */
// @ts-check

import { Far } from '@endo/far';
import { M, getCopyBagEntries, mustMatch } from '@endo/patterns';
import { AmountMath, AssetKind } from '@agoric/ertp/src/amountMath.js';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

const { Fail, quote: q } = assert;

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
 * This contract is parameterized by terms for price and,
 * optionally, a maximum number of items sold for that price (default: 3).
 *
 * @typedef {{
 *   price: Amount;
 *   maxItems?: bigint;
 * }} ItemTerms
 */

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Items, and
 *   - handles offers to buy up to `maxItems` items at a time.
 *
 * As is typical in Zoe contracts, the flow is:
 *   1. contract does internal setup
 *   2. client uses a public facet method -- {@link makeBuyItemsInvitation} in this case --
 *      to make an invitation.
 *   3. client makes an offer using the invitation, along with
 *      a proposal (with give and want) and payments. Zoe escrows the payments, and then
 *   4. Zoe invokes the offer handler specified in step 2 -- here {@link buyItemsHandler}.
 *
 * @param {ZCF<ItemTerms>} zcf
 */
export const start = async zcf => {
  const { price, maxItems = 3n } = zcf.getTerms();
  // Static types aren't enforced on callers of start(),
  // so use patterns to check supplied terms at runtime.
  mustMatch(price, AmountShape);
  mustMatch(maxItems, M.bigint());

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
   * a pattern to constrain proposals given to {@link buyItemsHandler}
   *
   * The `Pay` amount must use the brand from the `price` term.
   * The `Items` amount must use the `Item` brand and a bag value.
   */
  const proposalShape = harden({
    give: { Pay: { brand: price.brand, value: M.any() } },
    want: { Items: { brand: itemBrand, value: M.bag() } },
    exit: M.any(),
  });

  /** a seat for allocating proceeds of sales */
  const proceeds = zcf.makeEmptySeatKit().zcfSeat;

  /** @param {ZCFSeat} buyerSeat */
  const buyItemsHandler = buyerSeat => {
    // give and want are guaranteed by Zoe to match proposalShape
    const { give, want } = buyerSeat.getProposal();

    AmountMath.isGTE(give.Pay, price) ||
      Fail`${q(give.Pay)} below price of ${q(price)}}`;

    sum(bagCounts(want.Items.value)) <= maxItems ||
      Fail`max ${q(maxItems)} items allowed: ${q(want.Items)}`;

    const newItems = itemMint.mintGains(want);
    atomicRearrange(
      zcf,
      harden([
        // price from buyer to proceeds
        [buyerSeat, proceeds, { Pay: price }],
        // new items to buyer
        [newItems, buyerSeat, want],
      ]),
    );

    buyerSeat.exit(true);
    return 'trade complete';
  };

  /**
   * Make an invitation to buy items.
   *
   * Proposal Keywords used in offers using these invitations:
   *   - give: `Pay`
   *   - want: `Items`
   */
  const makeBuyItemsInvitation = () =>
    zcf.makeInvitation(buyItemsHandler, 'buy items', undefined, proposalShape);

  // Mark the publicFacet Far, i.e. reachable from outside the contract
  const publicFacet = Far('Items Public Facet', {
    makeBuyItemsInvitation,
  });
  return harden({ publicFacet });
};
harden(start);
