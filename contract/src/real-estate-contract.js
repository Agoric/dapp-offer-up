// @ts-check

import { Far } from '@endo/far';
import { M } from '@endo/patterns';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

/**
 * In addition to the standard `issuers` and `brands` terms,
 * this contract is parameterized by terms for price and,
 * optionally, a maximum number of items sold for that price (default: 3).
 *
 * @typedef {{
 *   propertiesCount: bigint;
 *   tokensPerProperty: bigint;
 * }} RealEstateTerms
 */

export const meta = {
  customTermsShape: M.splitRecord(
    { propertiesCount: M.bigint() },
    { tokensPerProperty: M.bigint() },
  ),
};
// compatibility with an earlier contract metadata API
export const customTermsShape = meta.customTermsShape;

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Items, and
 *   - handles offers to buy up to `maxItems` items at a time.
 *
 * @param {ZCF<RealEstateTerms>} zcf
 */
export const start = async zcf => {
  const { propertiesCount } = zcf.getTerms();

  /**
   * Create mints according to the number of needed properties
   */
  const issuerKits = [...Array(Number(propertiesCount))].map((_, index) =>
    {
      const issuer = makeIssuerKit(`PlayProperty_${index}`);
      zcf.saveIssuer(issuer.issuer, issuer.brand.getAllegedName());
      return issuer;
    }
  );

  const initialPayments = issuerKits.map(issuerKit =>
    issuerKit.mint.mintPayment(AmountMath.make(issuerKit.brand, 100n)),
  );

  const proposalShape = harden({
    exit: M.any(),
    give: { GiveAsset: M.any() },
    want: { WantAsset: M.any() },
  });

  // Creat a map of available properties indexed by their brand
  const availableProperties = {};

  const tradeHandler = buyerSeat => {
    const { give, want } = buyerSeat.getProposal();
    // if brand associated with the give is not IST then push/insert the buyerSeat to the availableProperties

    console.log(
      'give---------------------------------------------',
      give.GiveAsset.brand.getAllegedName(),
    );
    if (give.GiveAsset.brand.getAllegedName().startsWith('PlayProperty_')) {
      availableProperties[give.GiveAsset.brand.getAllegedName()] = buyerSeat;
      return 'Property has been made available for sale. Looking for buyers...';
    }

    // search brand of want in the availableProperties - if not found then exit the buyerSeat and return
    if (!availableProperties[want.WantAsset.brand.getAllegedName()])
      return buyerSeat.exit();

    // if found then then see if the buyerSeat matches the corresponding availableProperties property
    const sellerSeat =
      availableProperties[want.WantAsset.brand.getAllegedName()];

    // if sellerSeat.give is not equal to or greater than the buyerSeat.want then exit the buyerSeat and vice versa
    if (
      !AmountMath.isGTE(
        sellerSeat.getProposal().give.GiveAsset,
        want.WantAsset,
      ) ||
      !AmountMath.isGTE(give.GiveAsset, sellerSeat.getProposal().want.WantAsset)
    )
      return buyerSeat.exit();
    debugger;
    // All conditions meet - let us execute the trade
    atomicRearrange(
      zcf,
      harden([
        [buyerSeat, sellerSeat, give, sellerSeat.getProposal().want],
        [sellerSeat, buyerSeat, sellerSeat.getProposal().give, want],
      ]),
    );

    buyerSeat.exit(true);
    sellerSeat.exit();
    delete availableProperties[want.WantAsset.brand.getAllegedName()];
  };

  const makeTradeInvitation = () =>
    zcf.makeInvitation(tradeHandler, 'buy assets', undefined, proposalShape);

  const publicFacet = Far('Asset Public Facet', {
    makeTradeInvitation,
  });

  const creatorFacet = Far('Asset Creator Facet', {
    getInitialPayments: () => initialPayments,
  });
  return harden({ publicFacet, creatorFacet });
};

harden(start);
