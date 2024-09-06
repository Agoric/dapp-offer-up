// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

console.warn('start proposal module evaluating');

const { Fail } = assert;

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

const IST_UNIT = 1_000_000n;
const CENT = IST_UNIT / 100n;
const propertiesCount = 4n;

const tokenNames = [...Array(Number(propertiesCount))].map(
  (_, index) => `PlayProperty_${index}`,
);

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
export const startrealEstateContract = async permittedPowers => {
  console.error('startrealEstateContract()...');
  const {
    consume: { board, chainStorage, startUpgradable, zoe },
    brand: {
      consume: { IST: istBrandP },
      // @ts-expect-error dynamic extension to promise space
      produce: brandProducers,
    },
    issuer: {
      consume: { IST: istIssuerP },
      // @ts-expect-error dynamic extension to promise space
      produce: issueProducers,
    },
    installation: {
      consume: { realEstate: realEstateInstallationP },
    },
    instance: {
      // @ts-expect-error dynamic extension to promise space
      produce: { realEstate: produceInstance },
    },
  } = permittedPowers;

  // print all the powers
  console.log(
    '**************************************************',
    permittedPowers,
  );

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  const terms = { propertiesCount, tokensPerProperty: 100n };

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await realEstateInstallationP;

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'realEstate',
    terms,
  });
  console.log('CoreEval script: started contract', instance);
  const { brands, issuers } = await E(zoe).getTerms(instance);

  console.log(
    'CoreEval script: share via agoricNames:',
    await E(zoe).getTerms(instance),
  );

  produceInstance.reset();
  produceInstance.resolve(instance);

  for (const token of tokenNames) {
    const brand = brands[token];
    const issuer = issuers[token];
    brandProducers[token].reset();
    brandProducers[token].resolve(brand);
    issueProducers[token].reset();
    issueProducers[token].resolve(issuer);
  }

  //   await publishBrandInfo(chainStorage, board, brand);
  console.log('realEstate (re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const realEstateManifest = {
  [startrealEstateContract.name]: {
    consume: {
      agoricNames: true,
      board: true, // to publish boardAux info for NFT brand
      chainStorage: true, // to publish boardAux info for NFT brand
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand
    },
    installation: { consume: { realEstate: true } },
    issuer: {
      consume: { IST: true },
      produce: tokenNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}),
    },
    brand: {
      consume: { IST: true },
      produce: tokenNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}),
    },
    instance: { produce: { realEstate: true } },
  },
};
harden(realEstateManifest);

export const getManifestForRealEstate = ({ restoreRef }, { realEstateRef }) => {
  return harden({
    manifest: realEstateManifest,
    installations: {
      realEstate: restoreRef(realEstateRef),
    },
  });
};
