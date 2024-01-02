// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

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
 * @param {ERef<StorageNode>} chainStorage - Reference to the chain storage.
 * @param {string} boardId - Identifier for the board.
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  // Create a child node under BOARD_AUX in chain storage.
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  // Create a child node under the previously created node using boardId.
  return E(boardAux).makeChildNode(boardId);
};

/**
 * Publish brand information for a given board and brand.
 *
 * @param {ERef<StorageNode>} chainStorage - Reference to the chain storage.
 * @param {ERef<Board>} board - Reference to the board.
 * @param {Brand} brand - Brand to be published.
 */
const publishBrandInfo = async (chainStorage, board, brand) => {
  // Get the id and displayInfo of the brand.
  const [id, displayInfo] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
  ]);
  // Create a board aux node for the brand's id.
  const node = makeBoardAuxNode(chainStorage, id);
  // Marshal the displayInfo and set it as the value of the board aux node.
  const aux = marshalData.toCapData(harden({ displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

/**
 * Core eval script to start the game contract.
 *
 * @param {BootstrapPowers} permittedPowers - Powers required to start the contract.
 */
export const startGameContract = async permittedPowers => {
  console.error('startGameContract()...');
  // Destructure the permitted powers.
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

  // Get the IST issuer and brand.
  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  // Set the join price in terms for the game contract.
  const terms = { joinPrice: AmountMath.make(istBrand, 25n * CENT) };

  // Get the game1 installation.
  const installation = await game1InstallationP;

  // Start the upgradable contract with specified parameters.
  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'game1',
    terms,
  });
  console.log('CoreEval script: started game contract', instance);
  // Get the brand and issuer from contract terms.
  const {
    brands: { Place: brand },
    issuers: { Place: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  // Reset and resolve the promises for instance, brand, and issuer.
  produceInstance.reset();
  produceInstance.resolve(instance);

  producePlaceBrand.reset();
  producePlaceIssuer.reset();
  producePlaceBrand.resolve(brand);
  producePlaceIssuer.resolve(issuer);

  // Publish brand information for the board.
  await publishBrandInfo(chainStorage, board, brand);
  console.log('game1 (re)installed');
};

/** 
 * Bootstrap manifest for the game1 module.
 *
 * @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest }
 */
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
 * Get the manifest for the game1 module.
 *
 * @param {Object} restoreRef - Object containing a reference restoration function.
 * @param {Object} game1Ref - Reference for the game1 instance.
 * @returns {Object} - Hardened manifest and installations.
 */
export const getManifestForGame1 = ({ restoreRef }, { game1Ref }) => {
  return harden({
    manifest: gameManifest,
    installations: {
      game1: restoreRef(game1Ref),
    },
  });
};
