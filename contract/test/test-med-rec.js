/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';
import { createRequire } from 'module';
import { E } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/med-rec-contract.js`);

const test = anyTest;

const PROPERTIES_TO_CREATE = 4;

const makeTestContext = async _t => {
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();

  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const bundle = await bundleCache.load(contractPath, 'assetContract');

  const issuers = [...Array(PROPERTIES_TO_CREATE)].map((_, index) =>
    makeIssuerKit(`PlayProperty_${index}`),
  );

  return { zoe, bundle, bundleCache, feeMintAccess, issuers };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('Test real estate sell and buy', async t => {
  const moneyBrandKeyword = 'Money';
  const propertyUnitsToBuy = 4n;
  const sellerPerUnitPrice = 5n;

  const { bundle, zoe } = t.context;
  const moneyIssuerKit = makeIssuerKit(moneyBrandKeyword);

  const moneyAmountToOffer = AmountMath.make(
    moneyIssuerKit.brand,
    sellerPerUnitPrice,
  );

  const terms = {
    propertiesCount: BigInt(PROPERTIES_TO_CREATE),
    tokensPerProperty: 100n,
  };

  const installation = await E(zoe).install(bundle);
  const { instance, creatorFacet } = await E(zoe).startInstance(
    installation,
    { [moneyBrandKeyword]: moneyIssuerKit.issuer },
    terms,
  );
  const { issuers, brands } = await E(zoe).getTerms(instance);

  const creatorPayments = creatorFacet.getInitialPayments();
  const propertyIssuers = Object.entries(issuers)
    .filter(([brandKeyword]) => brandKeyword !== moneyBrandKeyword)
    .reduce(
      (acc, [brandKeyword, issuer]) => ({ ...acc, [brandKeyword]: issuer }),
      {},
    );

  const creatorPurses = Object.entries(propertyIssuers).reduce(
    (acc, [brandKeyword, issuer]) => {
      const purse = issuer.makeEmptyPurse();
      purse.deposit(creatorPayments[brandKeyword]);
      return { ...acc, [brandKeyword]: purse };
    },
    {},
  );

  const randomBrandIndex = Math.floor(
    Math.random() * Object.keys(propertyIssuers).length,
  );
  const brandToSell = Object.keys(propertyIssuers).find(
    (_, index) => randomBrandIndex === index,
  );

  const publicFacet = await E(zoe).getPublicFacet(instance);

  const property = issuers[brandToSell];
  const propertyAmountToOffer = AmountMath.make(brands[brandToSell], 50n);

  const propertyPayment = creatorPurses[brandToSell].withdraw(
    propertyAmountToOffer,
  );

  // Proposal to sell a property
  const sellProposal = {
    give: { GiveAsset: propertyAmountToOffer },
    want: {
      WantAsset: moneyAmountToOffer,
    },
  };

  const sellerSeat = await E(zoe).offer(
    E(publicFacet).makeTradeInvitation(),
    sellProposal,
    {
      GiveAsset: propertyPayment,
    },
  );

  // Proposal to buy a property
  const buyProposal = {
    give: { GiveAsset: AmountMath.make(moneyIssuerKit.brand, 20n) },
    want: {
      WantAsset: AmountMath.make(brands[brandToSell], propertyUnitsToBuy),
    },
  };
  const moneyPayment = moneyIssuerKit.mint.mintPayment(
    AmountMath.make(moneyIssuerKit.brand, 20n),
  );

  const buyerSeat = await E(zoe).offer(
    E(publicFacet).makeTradeInvitation(),
    buyProposal,
    {
      GiveAsset: moneyPayment,
    },
  );

  const propertiesBought = await E(buyerSeat).getPayout('WantAsset');
  t.deepEqual(
    await E(property).getAmountOf(propertiesBought),
    buyProposal.want.WantAsset,
  );

  const moneyReceived = await E(sellerSeat).getPayout('WantAsset');
  t.deepEqual(
    await E(moneyIssuerKit.issuer).getAmountOf(moneyReceived),
    AmountMath.make(
      moneyIssuerKit.brand,
      sellerPerUnitPrice * propertyUnitsToBuy,
    ),
  );
});
