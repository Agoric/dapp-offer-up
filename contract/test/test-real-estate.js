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

test('Test real estate sellP', async t => {
  const { bundle, issuers, zoe } = t.context;

  const money = makeIssuerKit('Money');
  const money5 = AmountMath.make(money.brand, 5n);
  const pmtMoney = money.mint.mintPayment(money5);

  const proprty = makeIssuerKit('Property');
  const property5 = AmountMath.make(proprty.brand, 5n);
  const pmtProperty = proprty.mint.mintPayment(property5);

  const terms = {
    propertiesToCreate: BigInt(PROPERTIES_TO_CREATE),
    tradePrice: issuers.map((_, index) =>
      AmountMath.make(money.brand, 5n + BigInt(index)),
    ),
  };

  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(
    installation,
    { Money: money.issuer, Property: proprty.issuer },
    terms,
  );

  const publicFacet = await E(zoe).getPublicFacet(instance);

  // Proposal to sell a property
  const proposal1 = {
    give: { GiveAsset: property5 },
    want: {
      WantAsset: money5,
    },
  };

  const sellerSeat = await E(zoe).offer(
    E(publicFacet).makeTradeInvitation(),
    proposal1,
    {
      GiveAsset: pmtProperty,
    },
  );

  // Proposal to buy a property
  const proposal2 = {
    give: { GiveAsset: money5 },
    want: {
      WantAsset: property5,
    },
  };

  const buyerSeat = await E(zoe).offer(
    E(publicFacet).makeTradeInvitation(),
    proposal2,
    {
      GiveAsset: pmtMoney,
    },
  );

  const propertiesBought = await E(buyerSeat).getPayout('WantAsset');
  t.deepEqual(
    await E(proprty.issuer).getAmountOf(propertiesBought),
    proposal2.want.WantAsset,
  );

  const moneyReceived = await E(sellerSeat).getPayout('WantAsset');
  t.deepEqual(
    await E(money.issuer).getAmountOf(moneyReceived),
    proposal1.want.WantAsset,
  );
});
