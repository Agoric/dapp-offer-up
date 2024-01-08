// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

console.warn('start-offer-items.js module evaluating');

const { Fail } = assert;

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

const IST_UNIT = 1_000_000n;
const CENT = IST_UNIT / 100n;

/**
 * Make a storage node for auxilliary data for a value on the board.
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {string} boardId
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

const publishBrandInfo = async (chainStorage, board, brand) => {
  const [id, displayInfo] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
  ]);
  const node = makeBoardAuxNode(chainStorage, id);
  const aux = marshalData.toCapData(harden({ displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} permittedPowers
 */
export const startOfferItemsContract = async permittedPowers => {
  console.error('startOfferItemsContract()...');
  const {
    consume: { board, chainStorage, startUpgradable, zoe },
    brand: {
      consume: { IST: istBrandP },
      // @ts-expect-error dynamic extension to promise space
      produce: { OfferItems: produceBrand },
    },
    issuer: {
      consume: { IST: istIssuerP },
      // @ts-expect-error dynamic extension to promise space
      produce: { OfferItems: produceIssuer },
    },
    installation: {
      consume: { offerItems: installationP },
    },
    instance: {
      // @ts-expect-error dynamic extension to promise space
      produce: { offerItems1: produceInstance },
    },
  } = permittedPowers;

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  const terms = { price: AmountMath.make(istBrand, 25n * CENT) };

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await installationP;

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Pay: istIssuer },
    label: 'offer-items1',
    terms,
  });
  console.log('CoreEval script: started offer-items contract', instance);
  const {
    brands: { Pay: brand },
    issuers: { Item: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  produceInstance.reset();
  produceInstance.resolve(instance);

  produceBrand.reset();
  produceIssuer.reset();
  produceBrand.resolve(brand);
  produceIssuer.resolve(issuer);

  await publishBrandInfo(chainStorage, board, brand);
  console.log('offerItems1 (re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const contractManifest = {
  [startOfferItemsContract.name]: {
    consume: {
      agoricNames: true,
      board: true, // to publish boardAux info for game NFT
      chainStorage: true, // to publish boardAux info for game NFT
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand
    },
    installation: { consume: { offerItems: true } },
    issuer: { consume: { IST: true }, produce: { OfferItems: true } },
    brand: { consume: { IST: true }, produce: { OfferItems: true } },
    instance: { produce: { offerItems1: true } },
  },
};
harden(contractManifest);

export const getManifest = ({ restoreRef }, { game1Ref }) => {
  return harden({
    manifest: contractManifest,
    installations: {
      game1: restoreRef(game1Ref),
    },
  });
};
