// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import '@agoric/zoe/exported.js';

console.warn('start-game1-proposal.js module evaluating');

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

/**
 * @param {ERef<StorageNode>} chainStorage
 * @param {ERef<import('@agoric/vats/src/types').Board>} board
 * @param {ERef<Brand>} brand
 */
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
 * XXX FIXME File '~/agoric-sdk/packages/vats/src/core/types.js' is not a module
 * @param {import('@agoric/vats/src/core/types').BootstrapPowers} permittedPowers
 */
export const startGameContract = async permittedPowers => {
  console.error('startGameContract()...');
  const {
    consume: { board, chainStorage, startUpgradable, zoe },
    brand: {
      consume: { IST: istBrandP },
      produce: { Place: producePlaceBrand },
    },
    issuer: {
      consume: { IST: istIssuerP },
      produce: { Place: producePlaceIssuer },
    },
    installation: {
      consume: { game1: game1InstallationP },
    },
    instance: {
      produce: { game1: produceInstance },
    },
  } = permittedPowers;

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  // NOTE: joinPrice could be configurable
  const terms = { joinPrice: AmountMath.make(istBrand, 25n * CENT) };

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await game1InstallationP;

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'game1',
    terms,
  });
  console.log('CoreEval script: started game contract', instance);
  const {
    brands: { Place: brand },
    issuers: { Place: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  produceInstance.reset();
  produceInstance.resolve(instance);

  producePlaceBrand.reset();
  producePlaceIssuer.reset();
  producePlaceBrand.resolve(brand);
  producePlaceIssuer.resolve(issuer);

  await publishBrandInfo(chainStorage, board, brand);
  console.log('game1 (re)installed');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const gameManifest = {
  [startGameContract.name]: {
    consume: {
      agoricNames: true,
      board: true, // to publish boardAux info for game NFT
      chainStorage: true, // to publish boardAux info for game NFT
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand
    },
    installation: { consume: { game1: true } },
    issuer: { consume: { IST: true }, produce: { Place: true } },
    brand: { consume: { IST: true }, produce: { Place: true } },
    instance: { produce: { game1: true } },
  },
};
harden(gameManifest);

/**
 * @param {{restoreRef: (ref: unknown) => Promise<unknown> }} r
 * @param {{ game1Ref: unknown }} g
 */
export const getManifestForGame1 = ({ restoreRef }, { game1Ref }) => {
  return harden({
    manifest: gameManifest,
    installations: {
      game1: restoreRef(game1Ref),
    },
  });
};
