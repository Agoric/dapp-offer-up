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
 *   4. Zoe invokes the offer handler specified in step 2 -- here {@link bidHandler}.
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
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

// Added for debugging/console.log
const bigintReplacer = (_, value) =>
  typeof value === 'bigint' ? value.toString() : value;

// #endregion

/**
 * In addition to the standard `issuers` and `brands` terms,
 * this contract is parameterized by terms for bid value and,
 * optionally, a maximum number of bids before closing an auction (default: 3).
 *
 * @typedef {{
 *   minBidPrice: Amount;
 *   maxBids?: bigint;
 * }} AuctionTerms
 */

export const meta = {
  customTermsShape: M.splitRecord(
    { minBidPrice: AmountShape },
    { maxItems: M.bigint() },
  ),
};

// compatibility with an earlier contract metadata API
export const customTermsShape = meta.customTermsShape;

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Items, and
 *   - handles offers to buy up to `maxItems` items at a time.
 *
 * @param {ZCF<AuctionTerms>} zcf
 */
export const start = async zcf => {
  const { minBidPrice, maxBids = 3n } = zcf.getTerms();

  const itemMint = await zcf.makeZCFMint('Item', AssetKind.COPY_BAG);
  const { brand: itemBrand } = itemMint.getIssuerRecord();

  const proposalShape = harden({
    give: { Price: M.gte(minBidPrice) },
    want: { Items: { brand: itemBrand, value: M.bag() } },
    exit: M.any(),
  });

  /** a seat for allocating proceeds of auction sales */
  const proceeds = zcf.makeEmptySeatKit().zcfSeat;
  // A register to keep all the bids of all items
  let bidsRegister = new Map();

  /** @type {OfferHandler} */
  const bidHandler = bidderSeat => {
    // give and want are guaranteed by Zoe to match proposalShape
    const { want } = bidderSeat.getProposal();
    const bidItem = JSON.stringify(want.Items.value, bigintReplacer);
    console.log(' bidItem is : ', bidItem);

    /**
    From the bidsRegister Map object, get the array of bids for the given item if it exists otherwise create one.
    and then place the current bid in that array.
    then count the number of bids in that array and check whether it is equal to the maxBids.
    If the number of bids are equal to max bid, we want to find out value of the max bid in the array.
    */

    // Check if the item already has a bid array in the Map; if not, create one
    if (!bidsRegister.has(bidItem)) {
      bidsRegister.set(bidItem, []);
    }

    // Get the existing bid array for the item
    let bids = bidsRegister.get(bidItem);

    // Add the current bid to the bid array
    bids.push(bidderSeat);

    // Check if the number of bids is equal to maxBids
    if (bids.length == maxBids) {
      console.log('Maximum bids reached for this item.');

      // Find the maximum bid in the array
      // Initialize the maximum bid as the first bid in the array
      let maxBid = bids[0];
      // Loop through the bids array to find the maximum bid
      for (let i = 1; i < bids.length; i++) {
        if (
          AmountMath.isGTE(
            bids[i].getCurrentAllocation().Price,
            maxBid.getCurrentAllocation().Price,
          )
        ) {
          maxBid = bids[i];
        }
      }

      const newItems = itemMint.mintGains(want);
      atomicRearrange(
        zcf,
        harden([
          [newItems, maxBid, want],
          [maxBid, proceeds, { Price: maxBid.getCurrentAllocation().Price }],
        ]),
      );
      newItems.exit();
      maxBid.exit(true);

      bids.forEach(async bidderSeatItem => {
        console.log(JSON.stringify(bidderSeatItem));
        if (!bidderSeatItem.hasExited()) {
          bidderSeatItem.exit(true);
        }
      });
      bidsRegister.set(bidItem, []);
    }
    return 'bid placed.';
  };

  const makeTradeInvitation = () =>
    zcf.makeInvitation(bidHandler, 'bid on items', undefined, proposalShape);

  // Mark the publicFacet Far, i.e. reachable from outside the contract
  const publicFacet = Far('Items Public Facet', {
    makeTradeInvitation,
  });
  return harden({ publicFacet });
};
harden(start);
