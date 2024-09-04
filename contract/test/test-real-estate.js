/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';
import { createRequire } from 'module';
import { E } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/real-estate-contract.js`);

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

test('Real estate buy', async t => {
  const { bundle, issuers, zoe } = t.context;

  const money = makeIssuerKit('ist');
  const terms = {
    propertiesToCreate: BigInt(PROPERTIES_TO_CREATE),
    tradePrice: issuers.map((_, index) =>
      AmountMath.make(money.brand, 5n + BigInt(index)),
    ),
  };

  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(
    installation,
    { SellAsset: money.issuer },
    terms,
  );

  const publicFacet = E(zoe).getPublicFacet(instance);
  const issuersFacet = await E(publicFacet).getPropertyIssuers();

  //   const issuerToTest = Math.floor(Math.random() * issuersFacet.length);
  const issuerToTest = 0;

  const issuer = issuersFacet[issuerToTest];

  const proposal = {
    give: { SellAsset: AmountMath.make(money.brand, 5n) },
    want: {
      BuyAsset: AmountMath.make(issuer.brand, 5n),
    },
  };

  const seat = E(zoe).offer(E(publicFacet).makeTradeInvitation(), proposal, {
    SellAsset: money.mint.mintPayment(AmountMath.make(money.brand, 5n)),
  });

  const items = await E(seat).getPayout('BuyAsset');
  const actual = await E(issuer.issuer).getAmountOf(items);
  t.deepEqual(actual, proposal.want.BuyAsset);
});

// create a test for the sell side
test('Test real estate sellP', async t => {
  const { bundle, issuers, zoe } = t.context;

  const money = makeIssuerKit('IST');
  const proprty = makeIssuerKit('Property');

  // E(zoe).zoeService.saveIssuer(proprty.issuer, 'Property');
  // E(zoe).zoeService.saveIssuer(money.issuer, 'IST');

  const pmtProperty = proprty.mint.mintPayment(AmountMath.make(proprty.brand, 5n));
  const pmtMoney = money.mint.mintPayment(AmountMath.make(money.brand, 5n));


  const terms = {
    propertiesToCreate: BigInt(PROPERTIES_TO_CREATE),
    tradePrice: issuers.map((_, index) =>
      AmountMath.make(money.brand, 5n + BigInt(index)),
    ),
  };

  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(
    installation,
    { Price: money.issuer },
    terms,
  );

  const publicFacet = E(zoe).getPublicFacet(instance);
  const issuersFacet = await E(publicFacet).getPropertyIssuers();

  //   const issuerToTest = Math.floor(Math.random() * issuersFacet.length);
  const issuerToTest = 1;

  const issuer = issuersFacet[issuerToTest];

  const proposal = {
    give: { GiveAsset: AmountMath.make(proprty.brand, 5n) },
    want: {
      WantAsset: AmountMath.make(money.brand, 5n),
    },
  };

  const seat = E(zoe).offer(E(publicFacet).makeTradeInvitation(), proposal, {
    Price: pmtProperty
  });
  console.log('seat', E(seat).getOfferResult());
  t.assert( !E(seat).hasExited() );






});





test('Test real estate sell', async t => {
  const { bundle, issuers, zoe } = t.context;

  const money = makeIssuerKit('ist');
  const terms = {
    propertiesToCreate: BigInt(PROPERTIES_TO_CREATE),
    tradePrice: issuers.map((_, index) =>
      AmountMath.make(money.brand, 5n + BigInt(index)),
    ),
  };

  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(
    installation,
    { Price: money.issuer },
    terms,
  );

  const publicFacet = E(zoe).getPublicFacet(instance);
  const issuersFacet = await E(publicFacet).getPropertyIssuers();

  //   const issuerToTest = Math.floor(Math.random() * issuersFacet.length);
  const issuerToTest = 1;

  const issuer = issuersFacet[issuerToTest];

  const proposal = {
    give: { Price: AmountMath.make(money.brand, 5n) },
    want: {
      Items: AmountMath.make(issuer.brand, 5n),
    },
  };

  const seat = E(zoe).offer(E(publicFacet).makeTradeInvitation(), proposal, {
    Price: money.mint.mintPayment(AmountMath.make(money.brand, 5n)),
  });

  const items = await E(seat).getPayout('Items');
  const actual = await E(issuer.issuer).getAmountOf(items);
  t.deepEqual(actual, proposal.want.Items);
});
