/**
 * @file Test basic trading using the offer up contract.
 */
// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { createRequire } from 'module';
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { makeCopyBag } from '@endo/patterns';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { makeStableFaucet } from './mintStable.js';
import { startOfferUpContract } from '../src/offer-up-proposal.js';

/** @typedef {typeof import('../src/offer-up.contract.js').start} AssetContractFn */

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/offer-up.contract.js`);

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const UNIT6 = 1_000_000n;

/**
 * Tests assume access to the zoe service and that contracts are bundled.
 *
 * See test-bundle-source.js for basic use of bundleSource().
 * Here we use a bundle cache to optimize running tests multiple times.
 *
 * @param {unknown} _t
 */
const makeTestContext = async _t => {
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();

  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const bundle = await bundleCache.load(contractPath, 'assetContract');

  return { zoe, bundle, bundleCache, feeMintAccess };
};

test.before(async t => (t.context = await makeTestContext(t)));

// IDEA: use test.serial and pass work products
// between tests using t.context.

test('Install the contract', async t => {
  const { zoe, bundle } = t.context;

  const installation = await E(zoe).install(bundle);
  t.log(installation);
  t.is(typeof installation, 'object');
});

test('Start the contract', async t => {
  const { zoe, bundle } = t.context;

  const money = makeIssuerKit('PlayMoney');
  const issuers = { Price: money.issuer };
  const timer = buildZoeManualTimer();
  console.log("timer::66", timer)
  
  
  debugger;
  const terms = {
    subscriptionPrice: AmountMath.make(money.brand, 10000000n),
    timerService: timer,
  };

  console.log('terms: 74', terms);

  const privateArgs = {
    timerService: timer,
  }

  /** @type {ERef<Installation<AssetContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms, privateArgs);
  t.log(instance);
  t.is(typeof instance, 'object');
});

/**
 * Alice trades by paying the price from the contract's terms.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {ZoeService} zoe
 * @param {ERef<import('@agoric/zoe/src/zoeService/utils').Instance<AssetContractFn>>} instance
 * @param {Purse} purse
 * @param {import('@agoric/time').TimerService} timer
 */
const alice = async (t, zoe, instance, purse, timer) => {
  const publicFacet = E(zoe).getPublicFacet(instance);
  // @ts-expect-error Promise<Instance> seems to work
  const terms = await E(zoe).getTerms(instance);
  
  // issue is timerService isnt being resolve
  const { issuers, brands, subscriptionPrice, timerService } = terms;

  await console.log("terms::99", terms)
  await console.log("timerService 100", timerService)
  await console.log("timer 106", timer)
  debugger;
  const currentTimeRecord = await E(timer).getCurrentTimestamp();
  // const currentTimeRecord = await E(terms.timerService).getCurrentTimestamp();
  // const currentTimeRecord = await timer.getCurrentTimestamp();
  t.is(1, 1)
  console.log("currentTimeRecord:", currentTimeRecord)
  const serviceType = 'Netflix';
  const choiceBag = makeCopyBag([
    [{ serviceStarted: currentTimeRecord, serviceType }, 1n],
  ]);

  const proposal = {
    give: { Price: subscriptionPrice },
    want: { Items: AmountMath.make(brands.Item, choiceBag) },
  };

  const pmt = await E(purse).withdraw(subscriptionPrice);
  t.log('Alice gives', proposal.give);

  const toTrade = E(publicFacet).makeTradeInvitation();

  const userAddress = 'agoric123456';
  const seat = E(zoe).offer(
    toTrade,
    proposal,
    { Price: pmt },
    { userAddress, serviceType },
  );
  const items = await E(seat).getPayout('Items');

  const actual = await E(issuers.Item).getAmountOf(items);
  t.log('Alice payout brand', actual.brand);
  t.log('Alice payout value', actual.value);
  t.deepEqual(actual, proposal.want.Items);

  const actualMovies = [`${serviceType}_Movie_1`, `${serviceType}_Movie_2`];
  const subscriptionMovies =
    await E(publicFacet).getSubscriptionResources(userAddress);

  t.deepEqual(actualMovies, subscriptionMovies);
};

// test('Alice trades: give some play money, want subscription', async t => {
//   const { zoe, bundle } = t.context;

//   const money = makeIssuerKit('PlayMoney');
//   const issuers = { Price: money.issuer };
//   const timer = buildZoeManualTimer();

//   console.log("timer 3: ", timer)
//   debugger;
//   const terms = {
//     subscriptionPrice: AmountMath.make(money.brand, 10000000n),
//     timerService: timer,
//   };
//   /** @type {ERef<Installation<AssetContractFn>>} */
//   const installation = E(zoe).install(bundle);
//   const { instance } = await E(zoe).startInstance(installation, issuers, terms, { timerService: timer });
//   t.log(instance);
//   t.is(typeof instance, 'object');

//   const alicePurse = money.issuer.makeEmptyPurse();
//   const amountOfMoney = AmountMath.make(money.brand, 10000000n);
//   const moneyPayment = money.mint.mintPayment(amountOfMoney);
//   alicePurse.deposit(moneyPayment);
//   await alice(t, zoe, instance, alicePurse, timer);

// });

test('Trade in IST rather than play money', async t => {
  /**
   * Start the contract, providing it with
   * the IST issuer.
   *
   * @param {{ zoe: ZoeService, bundle: {} }} powers
   */
  const startContract = async ({ zoe, bundle }) => {
    /** @type {ERef<Installation<AssetContractFn>>} */
    const installation = E(zoe).install(bundle);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const subscriptionPrice = AmountMath.make(feeBrand, 10000000n);
    const timer = buildZoeManualTimer();

    console.log("timer 183", timer)

    
    return E(zoe).startInstance(
      installation,
      { 
        Price: feeIssuer , 
        // timerService: timer
      },
      { 
        subscriptionPrice, 
        timerService: timer 
      },
      { 
        timerService: timer
      }
    );
  };

  const timer = buildZoeManualTimer();
  const { zoe, bundle, bundleCache, feeMintAccess } = t.context;
  const { instance } = await startContract({ zoe, bundle });
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  await alice(t, zoe, instance, await faucet(10n * UNIT6), timer);
});

test('use the code that will go on chain to start the contract', async t => {
  const noop = harden(() => {});

  // Starting the contract consumes an installation
  // and produces an instance, brand, and issuer.
  // We coordinate these with promises.
  const makeProducer = () => ({ ...makePromiseKit(), reset: noop });
  const sync = {
    installation: makeProducer(),
    instance: makeProducer(),
    brand: makeProducer(),
    issuer: makeProducer(),
  };

  /**
   * Chain bootstrap makes a number of powers available
   * to code approved by BLD staker governance.
   *
   * Here we simulate the ones needed for starting this contract.
   */
  const mockBootstrap = async () => {
    const board = { getId: noop };
    const chainStorage = Far('chainStorage', {
      makeChildNode: async () => chainStorage,
      setValue: async () => {},
    });

    const timer = buildZoeManualTimer();


    const { zoe } = t.context;
    const startUpgradable = async ({
      installation,
      issuerKeywordRecord,
      label,
      terms,
    }) => E(zoe).startInstance(installation, issuerKeywordRecord, terms, { timerService: terms.timer }, label);
    
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();

    const pFor = x => Promise.resolve(x);
    const powers = {
      consume: { zoe, chainStorage, startUpgradable, board, timer },
      brand: {
        consume: { IST: pFor(feeBrand) },
        produce: { Item: sync.brand },
      },
      issuer: {
        consume: { IST: pFor(feeIssuer) },
        produce: { Item: sync.issuer },
      },
      installation: { consume: { offerUp: sync.installation.promise } },
      instance: { produce: { offerUp: sync.instance } },
    };
    return powers;
  };

  const powers = await mockBootstrap();

  // Code to install the contract is automatically
  // generated by `agoric run`. No need to test that part.
  const { zoe, bundle } = t.context;
  const installation = E(zoe).install(bundle);
  sync.installation.resolve(installation);

  // When the BLD staker governance proposal passes,
  // the startup function gets called.
  await startOfferUpContract(powers);
  const instance = await sync.instance.promise;

  // Now that we have the instance, resume testing as above.
  const { feeMintAccess, bundleCache } = t.context;
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  await alice(t, zoe, instance, await faucet(10n * UNIT6), powers.consume.timer);
});
