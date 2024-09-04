// @ts-check

import { Far } from '@endo/far';
import { M } from '@endo/patterns';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import { AmountMath } from '@agoric/ertp';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

const { Fail, quote: q } = assert;

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

  /**
   * Create mints according to the number of needed properties
   */
  const propertyMints = await Promise.all(
    [...Array(Number(propertiesToCreate))].map((_, index) =>
      zcf.makeZCFMint(`PlayProperty_${index}`),
    ),
  );

  const zcfSeats = propertyMints.map(propertyMint =>
    propertyMint.mintGains({
      BuyAsset: AmountMath.make(
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

  const proposalShape = harden({
    exit: M.any(),
    give: { SellAsset: M.any() },
    want: { BuyAsset: M.any() },
  });

  const tradeHandler = buyerSeat => {
    const { give, want } = buyerSeat.getProposal();
    const zcfSeat = zcfSeatsMap[want.BuyAsset.brand.getAllegedName()];

    !!zcfSeat || Fail`Brand ${q(want.BuyAsset.brand)} not allowed`;

    const maxItems = zcfSeat.getCurrentAllocation().BuyAsset.value;
    const minimumTradePrice =
      tradePrice[
        propertyMints.findIndex(
          propertyMint =>
            propertyMint.getIssuerRecord().brand.getAllegedName() ===
            want.BuyAsset.brand.getAllegedName(),
        )
      ];

    (maxItems && maxItems >= want.BuyAsset.value) ||
      Fail`max ${q(maxItems)} items allowed: ${q(want.BuyAsset)}`;
    (minimumTradePrice &&
      AmountMath.isGTE(give.SellAsset, minimumTradePrice)) ||
      Fail`Price ${q(give.SellAsset)} is less then minimum price ${q(
        minimumTradePrice,
      )}`;

    atomicRearrange(
      zcf,
      harden([
        [buyerSeat, zcfSeat, { SellAsset: give.SellAsset }],
        [zcfSeat, buyerSeat, want],
      ]),
    );

    buyerSeat.exit(true);
    zcfSeat.exit();
  };

  const getPropertyIssuers = () =>
    propertyMints.map(propertyMint => propertyMint.getIssuerRecord());

  const makeTradeInvitation = () =>
    zcf.makeInvitation(tradeHandler, 'buy assets', undefined, proposalShape);

  const publicFacet = Far('Asset Public Facet', {
    makeTradeInvitation,
    getPropertyIssuers,
  });
  return harden({ publicFacet });
};

harden(start);
