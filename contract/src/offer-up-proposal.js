// @ts-check
import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

import { manifest as boardAuxManifest } from './platform-goals/boardAux.js';
import { manifest as endoManifest } from './platform-goals/marshal-produce.js';

export { produceBoardAuxManager } from './platform-goals/boardAux.js';
export { produceEndoModules } from './platform-goals/marshal-produce.js';

console.warn('start proposal module evaluating');

const IST_UNIT = 1_000_000n;
const CENT = IST_UNIT / 100n;

/** @template {string} T @typedef {import('./platform-goals/core-types').AssetsSpace<T>} AssetsSpace */
/** @template {string} T @typedef {import('./platform-goals/core-types').ContractSpace<T>} ContractSpace */

/**
 * @typedef {AssetsSpace<'Item'>
 *  & ContractSpace<'offerUp'>
 * } OfferUpPowers
 */

/**
 * Core eval script to start contract
 *
 * @param {import('./platform-goals/core-types').BootstrapPowers
 *   & OfferUpPowers
 *   & import('./platform-goals/boardAux').BoardAuxPowers
 *  } permittedPowers
 */
export const startOfferUpContract = async permittedPowers => {
  console.error('startOfferUpContract()...');
  const {
    consume: { brandAuxPublisher, startUpgradable, zoe },
    brand: {
      consume: { IST: istBrandP },
      produce: { Item: produceItemBrand },
    },
    issuer: {
      consume: { IST: istIssuerP },
      produce: { Item: produceItemIssuer },
    },
    installation: {
      consume: { offerUp: offerUpInstallationP },
    },
    instance: {
      produce: { offerUp: produceInstance },
    },
  } = permittedPowers;

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  const terms = { tradePrice: AmountMath.make(istBrand, 25n * CENT) };

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await offerUpInstallationP;

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'offerUp',
    terms,
  });
  console.log('CoreEval script: started contract', instance);
  /** @type {StandardTerms} */
  const {
    brands: { Item: brand },
    issuers: { Item: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  produceInstance.reset();
  produceInstance.resolve(instance);

  produceItemBrand.reset();
  produceItemIssuer.reset();
  produceItemBrand.resolve(brand);
  produceItemIssuer.resolve(issuer);

  await E(brandAuxPublisher).publishBrandInfo(brand);
  console.log('offerUp (re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const offerUpManifest = {
  [startOfferUpContract.name]: {
    consume: {
      agoricNames: true,
      brandAuxPublisher: true, // to publish displayInfo of NFT brand
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand
    },
    installation: { consume: { offerUp: true } },
    issuer: { consume: { IST: true }, produce: { Item: true } },
    brand: { consume: { IST: true }, produce: { Item: true } },
    instance: { produce: { offerUp: true } },
  },
};
harden(offerUpManifest);

export const getManifestForOfferUp = ({ restoreRef }, { offerUpRef }) => {
  return harden({
    manifest: { ...offerUpManifest, ...boardAuxManifest, ...endoManifest },
    installations: {
      offerUp: restoreRef(offerUpRef),
    },
  });
};
