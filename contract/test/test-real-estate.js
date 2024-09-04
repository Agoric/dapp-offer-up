/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';
import { makeCopyBag } from '@endo/patterns';
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

test('Install the real estate contract', async t => {
  const { zoe, bundle } = t.context;

  const installation = await E(zoe).install(bundle);
  t.log(installation);
  t.is(typeof installation, 'object');
});

test('Start the real estate contract', async t => {
  const { bundle, issuers, zoe } = t.context;

  const money = makeIssuerKit('PlayMoney');
  const terms = {
    propertiesToCreate: BigInt(PROPERTIES_TO_CREATE),
    tradePrice: issuers.map((issuer, index) =>
      AmountMath.make(issuer.brand, 5n + BigInt(index)),
    ),
  };
  t.log('terms:', terms);

  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(
    installation,
    { Price: money.issuer },
    terms,
  );
  const publicFacet = E(zoe).getPublicFacet(instance);
  console.log("E(publicFacet).getPropertyIssuers(): ", E(publicFacet).getPropertyIssuers());

  const proposal = {
    give: { Price: AmountMath.make(money.brand, 5n) },
    want: {
      Items: AmountMath.make(
        (await E(publicFacet).getPropertyIssuers())[0].getBrand(),
        makeCopyBag([[(await E(publicFacet).getPropertyIssuers())[0].getBrand(), 5n]]),
      ),
    },
  };
  await E(zoe).offer(E(publicFacet).makeTradeInvitation(), proposal, {
    Price: money.mint.mintPayment(AmountMath.make(money.brand, 5n)),
  });

  t.log(instance);
  t.is(typeof instance, 'object');
});
