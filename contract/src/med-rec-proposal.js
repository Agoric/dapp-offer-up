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
const propertiesCount = 1n;

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
export const startpatientDataContract = async permittedPowers => {
  console.error('startpatientDataContract()...');
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
      consume: { patientData: patientDataInstallationP },
    },
    instance: {
      // @ts-expect-error dynamic extension to promise space
      produce: { patientData: produceInstance },
    },
  } = permittedPowers;

  // print all the powers
  console.log(
    '**************************************************',
    permittedPowers,
  );

  const storageNode = await E(chainStorage).makeChildNode('patientData');

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  const terms = { maxPatients: 100n };

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await patientDataInstallationP;

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'patientData',
    terms,
    privateArgs: {
      storageNode,
      board,
    },
  });
  console.log('CoreEval script: started contract', instance);
  const { brands, issuers } = await E(zoe).getTerms(instance);

  // const creatorPayments = creatorFacet.getInitialPayments();
  // const creatorPurses = Object.entries(issuers).reduce(
  //   (acc, [brandKeyword, issuer]) => {
  //     const purse = issuer.makeEmptyPurse();
  //     purse.deposit(creatorPayments[brandKeyword]);
  //     return { ...acc, [brandKeyword]: purse };
  //   },
  //   {},
  // );

  // const brandToSell = 'PlayProperty_0';

  // const publicFacet = await E(zoe).getPublicFacet(instance);

  // const propertyAmountToOffer = AmountMath.make(brands[brandToSell], 100n);

  // const propertyPayment = creatorPurses[brandToSell].withdraw(
  //   propertyAmountToOffer,
  // );

  // const moneyAmountToOffer = AmountMath.make(istIssuer.brand, 100n);
  // // Proposal to sell a property
  // const sellProposal = {
  //   give: { GiveAsset: propertyAmountToOffer },
  //   want: {
  //     WantAsset: moneyAmountToOffer,
  //   },
  // };

  // const sellerSeat = await E(zoe).offer(
  //   E(publicFacet).makeTradeInvitation(),
  //   sellProposal,
  //   {
  //     GiveAsset: propertyPayment,
  //   },
  // );

  console.log('CoreEval script: share via agoricNames:', {
    brands,
    issuers,
  });

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
  console.log('patientData (re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const patientDataManifest = {
  [startpatientDataContract.name]: {
    consume: {
      agoricNames: true,
      board: true, // to publish boardAux info for NFT brand
      chainStorage: true, // to publish boardAux info for NFT brand
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand
    },
    installation: { consume: { patientData: true } },
    issuer: {
      consume: { IST: true },
      produce: tokenNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}),
    },
    brand: {
      consume: { IST: true },
      produce: tokenNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}),
    },
    instance: { produce: { patientData: true } },
  },
};
harden(patientDataManifest);

export const getManifestForpatientData = ({ restoreRef }, { patientDataRef }) => {
  return harden({
    manifest: patientDataManifest,
    installations: {
      patientData: restoreRef(patientDataRef),
    },
  });
};
