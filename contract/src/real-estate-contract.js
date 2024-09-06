// @ts-check

import { Far } from '@endo/far';
import { M } from '@endo/patterns';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

/**
 * @typedef {{
 *   propertiesCount: bigint;
 * tokensPerProperty: bigint
 * }} OfferUpTerms
 */

export const meta = {
  customTermsShape: M.splitRecord({
    propertiesCount: M.bigint(),
    tokensPerProperty: M.bigint(),
  }),
};

const PROPERTY_BRAND_NAME_PREFIX = 'PlayProperty_';

/**
 * @param {ZCF<OfferUpTerms>} zcf
 */
export const start = async zcf => {
  const { propertiesCount, tokensPerProperty } = zcf.getTerms();

  /**
   * Create mints according to the number of needed properties
   */
  const issuerKits = [...Array(Number(propertiesCount))].map((_, index) =>
    makeIssuerKit(`${PROPERTY_BRAND_NAME_PREFIX}${index}`),
  );

  // eslint-disable-next-line github/array-foreach
  await Promise.all(
    issuerKits.map(issuerKit =>
      zcf.saveIssuer(issuerKit.issuer, issuerKit.brand.getAllegedName()),
    ),
  );

  const initialPayments = issuerKits.reduce(
    (acc, issuerKit) => ({
      ...acc,
      [issuerKit.brand.getAllegedName()]: issuerKit.mint.mintPayment(
        AmountMath.make(issuerKit.brand, tokensPerProperty),
      ),
    }),
    {},
  );

  const proposalShape = harden({
    exit: M.any(),
    give: { GiveAsset: M.any() },
    want: { WantAsset: M.any() },
  });

  /**
   * Create a map of available properties indexed by their brand
   *
   * @type {{[key: string]: ZCFSeat}}
   */
  const availableProperties = {};

  /** @type {OfferHandler} */
  const tradeHandler = buyerSeat => {
    const { give: buyerGiveProposal, want: buyerWantProposal } =
      buyerSeat.getProposal();

    if (
      buyerGiveProposal.GiveAsset.brand
        .getAllegedName()
        .startsWith(PROPERTY_BRAND_NAME_PREFIX)
    )
      availableProperties[buyerGiveProposal.GiveAsset.brand.getAllegedName()] =
        buyerSeat;
    else {
      if (
        !availableProperties[buyerWantProposal.WantAsset.brand.getAllegedName()]
      )
        return buyerSeat.exit();

      // if found then then see if the buyerSeat matches the corresponding availableProperties property
      const sellerSeat =
        availableProperties[buyerWantProposal.WantAsset.brand.getAllegedName()];
      const { give: sellerGiveProposal, want: sellerWantProposal } =
        sellerSeat.getProposal();

      // if sellerSeat.give is not equal to or greater than the buyerSeat.want then exit the buyerSeat and vice versa
      if (
        !(
          sellerGiveProposal.GiveAsset.value >=
            buyerWantProposal.WantAsset.value &&
          buyerGiveProposal.GiveAsset.value /
            buyerWantProposal.WantAsset.value >=
            sellerWantProposal.WantAsset.value
        )
      )
        return buyerSeat.exit();

      // All conditions meet - let us execute the trade
      atomicRearrange(
        zcf,
        harden([
          [
            buyerSeat,
            sellerSeat,
            {
              GiveAsset: AmountMath.make(
                buyerGiveProposal.GiveAsset.brand,
                buyerGiveProposal.GiveAsset.value,
              ),
            },
            {
              WantAsset: AmountMath.make(
                sellerWantProposal.WantAsset.brand,
                buyerGiveProposal.GiveAsset.value,
              ),
            },
          ],
          [
            sellerSeat,
            buyerSeat,
            {
              GiveAsset: buyerWantProposal.WantAsset,
            },
            {
              WantAsset: buyerWantProposal.WantAsset,
            },
          ],
        ]),
      );

      buyerSeat.exit(true);
      sellerSeat.exit();
      delete availableProperties[
        buyerWantProposal.WantAsset.brand.getAllegedName()
      ];
    }
  };

  const makeTradeInvitation = () =>
    zcf.makeInvitation(
      tradeHandler,
      'sell/buy assets',
      undefined,
      proposalShape,
    );

  return harden({
    creatorFacet: Far('Asset Creator Facet', {
      getInitialPayments: () => initialPayments,
    }),
    publicFacet: Far('Asset Public Facet', {
      makeTradeInvitation,
    }),
  });
};

harden(start);
