// @ts-check
import { E } from '@endo/far';

console.warn('start proposal module evaluating');

const propertiesCount = 4n;

const tokenNames = [...Array(Number(propertiesCount))].map(
  (_, index) => `PlayProperty_${index}`,
);

export const startrealEstateContract = async permittedPowers => {
  console.error('startrealEstateContract()...');
  const {
    brand: { produce: brandProducers },
    consume: { startUpgradable, zoe },
    installation: {
      consume: { realEstate: realEstateInstallationP },
    },
    instance: {
      produce: { realEstate: produceInstance },
    },
    issuer: {
      consume: { IST: istIssuerP },
      produce: issueProducers,
    },
  } = permittedPowers;

  const [installation, istIssuer] = await Promise.all([
    istIssuerP,
    realEstateInstallationP,
  ]);

  const terms = { propertiesCount, tokensPerProperty: 100n };

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'realEstate',
    terms,
  });

  console.log('CoreEval script: started contract', instance);
  const { brands, issuers, ...rest } = await E(zoe).getTerms(instance);

  console.log(
    'CoreEval script: share via agoricNames:',
    { brands, issuers, ...rest },
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

  // await publishBrandInfo(chainStorage, board, brand);
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
