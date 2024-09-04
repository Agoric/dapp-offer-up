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
      makeIssuerKit(`PlayProperty_${index}`),
    ),
  );
  console.log('propertyMints: ', propertyMints);

  /**
   * Mint coins according to the `COINS_PER_PROPERTIES` value
   */
  const payments = propertyMints.map(propertyMint =>
    propertyMint.mint.mintPayment(
      AmountMath.make(propertyMint.brand, BigInt(COINS_PER_PROPERTIES)),
    ),
  );
  propertyMints.map(propertyMint =>
    zcf.saveIssuer(propertyMint.issuer, propertyMint.brand.getAllegedName()),
  );
  console.log('payments: ', payments);

  /**
   * Deposit all the coins in a corresponding wallet.
   * This wallet will hold the number of available coins
   * that can be bought
   */
  const purses = propertyMints.map(propertyMint =>
    propertyMint.issuer.makeEmptyPurse(),
  );
  purses.forEach((purse, index) => purse.deposit(payments[index]));

  const purseMap = propertyMints.reduce((acc, mint, index) => (
    {
        ...acc,
        [mint.brand.getAllegedName()]: purses[index]
    }
  ), {})
  console.log('purseMap: ', purseMap);

  /**
   * a pattern to constrain proposals given to {@link tradeHandler}
   *
   * The `Price` amount must be >= `tradePrice` term.
   * The `Items` amount must use the `Item` brand and a bag value.
   */
  const proposalShape = harden({
    give: { Price: M.any() },
    want: { Items: { brand: M.any(), value: M.bag() } },
    exit: M.any(),
  });

  const tradeHandler = buyerSeat => {
    const { give, want } = buyerSeat.getProposal();
    console.log("purseMap[want.Items.brand]?.getCurrentAmount(): ", purseMap[want.Items.brand]?.getCurrentAmount());

    // sum(bagCounts(want.Items.value)) <= maxItems ||
    //   Fail`max ${q(maxItems)} items allowed: ${q(want.Items)}`;

    // const newItems = itemMint.mintGains(want);
    // atomicRearrange(
    //   zcf,
    //   harden([
    //     // price from buyer to proceeds
    //     [buyerSeat, proceeds, { Price: tradePrice }],
    //     // new items to buyer
    //     [newItems, buyerSeat, want],
    //   ]),
    // );

    buyerSeat.exit(true);
    // newItems.exit();
    return 'trade complete';
  };

  const getPropertyIssuers = () => propertyMints.map((propertyMint) => propertyMint.issuer);

  const makeTradeInvitation = () =>
    zcf.makeInvitation(tradeHandler, 'buy items', undefined, proposalShape);

  const publicFacet = Far('Items Public Facet', {
    makeTradeInvitation,
    getPropertyIssuers,
  });
  return harden({ publicFacet });
};

harden(start);
