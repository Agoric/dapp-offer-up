// @ts-check

import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import { AmountMath } from '@agoric/ertp';
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
export const start = async (zcf, privateArgs) => {
  const { propertiesCount, tokensPerProperty } = zcf.getTerms();

  /**
   * Create mints according to the number of needed properties
   */
  const zcfMints = await Promise.all(
    [...Array(Number(propertiesCount))].map((_, index) =>
      zcf.makeZCFMint(`${PROPERTY_BRAND_NAME_PREFIX}${index}`),
    ),
  );

  const zcfSeat = zcfMints.reduce(
    (seat, zcfMint) =>
      zcfMint.mintGains(
        {
          WantAsset: {
            brand: zcfMint.getIssuerRecord().brand,
            value: tokensPerProperty,
          },
        },
        seat,
      ),
    undefined,
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

  const myContractDataNode = await E(privateArgs.storageNode).makeChildNode(
    'offers',
  );
  const marshaller = await E(privateArgs.board).getPublishingMarshaller();

  const updateVStorage = async () => {
    await null;
    const marshalData = JSON.stringify(
      await E(marshaller).toCapData(
        Object.fromEntries(
          Object.entries(availableProperties).map(([brand, offer]) => [
            brand,
            {
              give: offer.getProposal().give.GiveAsset.value,
              want: offer.getProposal().want.WantAsset.value,
            },
          ]),
        ),
      ),
    );
    console.log(marshalData);
    await E(myContractDataNode).setValue(marshalData);
  };

  await updateVStorage();

  /**
   * @param { ZCFSeat } buyerSeat
   * @param {{ userAddress: string, sell: boolean, propertyName: string}} offerArgs
   */
  const tradeHandler = (buyerSeat, offerArgs) => {
    const userAddress = offerArgs?.userAddress || 'None';
    const propertyName = offerArgs?.propertyName;
    const sell = offerArgs?.sell;

    const { give: buyerGiveProposal, want: buyerWantProposal } =
      buyerSeat.getProposal();

    if (userAddress === 'Creator_Address') {
      atomicRearrange(zcf, harden([[zcfSeat, buyerSeat, buyerWantProposal]]));
      return buyerSeat.exit();
    }

    console.log('fraz', propertyName);
    console.log(offerArgs);
    if (sell && propertyName.startsWith(PROPERTY_BRAND_NAME_PREFIX)) {
      availableProperties[propertyName] = buyerSeat;
      updateVStorage();
    } else {
      if (!availableProperties[propertyName]) {
        console.log('in condition B');
        return buyerSeat.exit();
      }

      // if found then then see if the buyerSeat matches the corresponding availableProperties property
      const sellerSeat = availableProperties[propertyName];
      const { give: sellerGiveProposal, want: sellerWantProposal } =
        sellerSeat.getProposal();

      // if sellerSeat.give is not equal to or greater than the buyerSeat.want then exit the buyerSeat and vice versa
      if (
        !(
          buyerWantProposal.WantAsset.value &&
          sellerGiveProposal.GiveAsset.value >=
            buyerWantProposal.WantAsset.value
        )
      ) {
        console.log('buyer want', buyerWantProposal.WantAsset.value);
        console.log('seller give', sellerGiveProposal.GiveAsset.value);
        console.log('buyer give', buyerGiveProposal.GiveAsset.value);
        console.log('seller want', sellerWantProposal.WantAsset.value);
        console.log(
          'buyer give / want',
          buyerGiveProposal.GiveAsset.value / buyerWantProposal.WantAsset.value,
        );
        console.log('in condition A');
        return buyerSeat.exit();
      }

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

      console.log('before exit');
      buyerSeat.exit(true);
      sellerSeat.exit();
      delete availableProperties[propertyName];
      updateVStorage();

      console.log('after exit');
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
    publicFacet: Far('Asset Public Facet', {
      makeTradeInvitation,
    }),
  });
};

harden(start);
