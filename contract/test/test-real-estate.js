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

  const terms = {
    propertiesToCreate: BigInt(PROPERTIES_TO_CREATE),
    tradePrice: issuers.map((_, index) =>
      AmountMath.make(money.brand, 5n + BigInt(index)),
    ),
  };

  const installation = await E(zoe).install(bundle);
  const { instance, creatorFacet } = await E(zoe).startInstance(
    installation,
    { Money: money.issuer },
    terms,
  );

  const { issuers: iss, brands } = await E(zoe).getTerms(instance);
  const creatorPayments = creatorFacet.getInitialPayments();
  const creatorPurses = [
    'PlayProperty_0',
    'PlayProperty_1',
    'PlayProperty_2',
    'PlayProperty_3',
  ]
    .map((name, index) => {
      const purse = iss[name].makeEmptyPurse();
      purse.deposit(creatorPayments[index]);
      return purse;
    });

  const publicFacet = await E(zoe).getPublicFacet(instance);

  
  const proprty = iss.PlayProperty_0;
  const property5 = AmountMath.make(brands.PlayProperty_0, 5n);
  
  const pmtProperty = creatorPurses[0].withdraw(property5);

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
    await E(proprty).getAmountOf(propertiesBought),
    proposal2.want.WantAsset,
  );

  const moneyReceived = await E(sellerSeat).getPayout('WantAsset');
  t.deepEqual(
    await E(money.issuer).getAmountOf(moneyReceived),
    proposal1.want.WantAsset,
  );
});
