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
import { AssetKind } from '@agoric/ertp/src/amountMath.js';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
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
 * In addition to the standard `issuers` and `brands` terms,
 * this contract is parameterized by terms for price and,
 * optionally, a maximum number of items sold for that price (default: 3).
 *
 * @typedef {{
 *   propertiesToCreate: bigint;
 *   tradePrice: Amount;
 * }} OfferUpTerms
 */

export const meta = {
  customTermsShape: M.splitRecord(
    { propertiesToCreate: M.bigint() },
    { tradePrice: M.arrayOf(AmountShape) },
  ),
};
// compatibility with an earlier contract metadata API
export const customTermsShape = meta.customTermsShape;

const COINS_PER_PROPERTIES = 100;

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Items, and
 *   - handles offers to buy up to `maxItems` items at a time.
 *
 * @param {ZCF<OfferUpTerms>} zcf
 */
export const start = async zcf => {
  const { propertiesToCreate, tradePrice } = zcf.getTerms();
  console.log('zcf.getTerms(): ', zcf.getTerms());

  /**
   * Create mints according to the number of needed properties
   */
  const propertyMints = await Promise.all(
    [...Array(Number(propertiesToCreate))].map((_, index) =>
      zcf.makeZCFMint(`PlayProperty_${index}`),
    ),
  );
  console.log('propertyMints: ', propertyMints);
  const zcfSeats = propertyMints.map(propertyMint =>
    propertyMint.mintGains({
      Items: AmountMath.make(
        propertyMint.getIssuerRecord().brand,
        BigInt(COINS_PER_PROPERTIES),
      ),
    }),
  );

  const zcfSeatsMap = zcfSeats.reduce(
    (acc, zcfSeat, index) => ({
      ...acc,
      [propertyMints[index].getIssuerRecord().brand.getAllegedName()]: zcfSeat,
    }),
    {},
  );
  console.log('purseMap: ', zcfSeatsMap);

  const proposalShape = harden({
    give: { Price: M.any() },
    want: { Items: { brand: M.any(), value: M.bigint() } },
    exit: M.any(),
  });

  const tradeHandler = buyerSeat => {
    const { give, want } = buyerSeat.getProposal();
    const zcfSeat = zcfSeatsMap[want.Items.brand.getAllegedName()];

    !!zcfSeat || Fail`Brand ${q(want.Items.brand)} not allowed`;

    const maxItems = zcfSeat.getCurrentAllocation().Items.value;
    const minimumTradePrice =
      tradePrice[
        propertyMints.findIndex(
          propertyMint =>
            propertyMint.getIssuerRecord().brand.getAllegedName() ===
            want.Items.brand.getAllegedName(),
        )
      ];

    (maxItems && maxItems >= want.Items.value) ||
      Fail`max ${q(maxItems)} items allowed: ${q(want.Items)}`;
    (minimumTradePrice && AmountMath.isGTE(give.Price, minimumTradePrice)) ||
      Fail`Price ${q(give.Price)} is less then minimum price ${q(
        minimumTradePrice,
      )}`;

    atomicRearrange(
      zcf,
      harden([
        [buyerSeat, zcfSeat, { Price: give.Price }],
        [zcfSeat, buyerSeat, want],
      ]),
    );

    buyerSeat.exit(true);
    zcfSeat.exit();
    return 'trade complete';
  };

  const getPropertyIssuers = () =>
    propertyMints.map(propertyMint => propertyMint.getIssuerRecord());

  const makeTradeInvitation = () =>
    zcf.makeInvitation(tradeHandler, 'buy items', undefined, proposalShape);

  const publicFacet = Far('Items Public Facet', {
    makeTradeInvitation,
    getPropertyIssuers,
  });
  return harden({ publicFacet });
};

harden(start);
