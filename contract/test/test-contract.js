/**
 * @file Test basic trading using the offer up contract.
 */
// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';

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
const CENT = UNIT6 / 100n;

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
  const terms = { minBidPrice: AmountMath.make(money.brand, 5n) };
  t.log('terms:', terms);

  /** @type {ERef<Installation<AssetContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);
  t.log(instance);
  t.is(typeof instance, 'object');
});

/**
 * Alice trades by paying the price from the contract's terms.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {ZoeService} zoe
 * @param {ERef<import('@agoric/zoe/src/zoeService/utils').Instance<AssetContractFn>} instance
 * @param {Purse} purse
 * @param {string[]} choices
 */
const alice = async (t, zoe, instance, purse, choices = ['map'], bidValue = 25n * CENT, isMaxbid = false) => {
  const publicFacet = E(zoe).getPublicFacet(instance);
  // @ts-expect-error Promise<Instance> seems to work
  const terms = await E(zoe).getTerms(instance);
  const { brands, minBidPrice } = terms;
  const bidPrice = AmountMath.make(minBidPrice.brand, bidValue);
  
  const choiceBag = makeCopyBag(choices.map(name => [name, 1n]));
  const proposal = {
    give: { Price: bidPrice },
    want: { Items: AmountMath.make(brands.Item, choiceBag) },
  };
  const pmt = await E(purse).withdraw(bidPrice);
  t.log('Alice gives', proposal.give);
  // #endregion makeProposal

  const toTrade = E(publicFacet).makeTradeInvitation();

  const seat = await E(zoe).offer(toTrade, proposal, { Price: pmt } );
  return {seat, proposal, pmt};

};
const verifyBidSeat = async (t, seat, proposal, zoe, instance, purse, isMaxbid = false) => {

  const terms = await E(zoe).getTerms(instance);
  const { issuers, minBidPrice } = terms;
  const zeroPrice = AmountMath.make(minBidPrice.brand, 0n);


  if (isMaxbid){
    const items = await E(seat).getPayout('Items') ;
    const actual = await E(issuers.Item).getAmountOf(items);
    t.deepEqual(actual, proposal.want.Items);
    const pmt = await E(seat).getPayout('Price') ;
    const pmtAmount = await E(purse).deposit(pmt);
    t.deepEqual(zeroPrice, pmtAmount);
  } else {
    const pmt = await E(seat).getPayout('Price') ;
    const pmtAmount = await E(purse).deposit(pmt);
    t.notDeepEqual(zeroPrice, pmtAmount);
  }

};


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

    const { zoe } = t.context;
    const startUpgradable = async ({
      installation,
      issuerKeywordRecord,
      label,
      terms,
    }) =>
      E(zoe).startInstance(installation, issuerKeywordRecord, terms, {}, label);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();

    const pFor = x => Promise.resolve(x);
    const powers = {
      consume: { zoe, chainStorage, startUpgradable, board },
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
  await alice(t, zoe, instance, await faucet(5n * UNIT6));
  t.log(instance);
  t.is(typeof instance, 'object');
});


test('bidSeats saved in Maps', async t => {

  const startContract = async ({ zoe, bundle }) => {
    /** @type {ERef<Installation<AssetContractFn>>} */
    const installation = E(zoe).install(bundle);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const minBidPrice = AmountMath.make(feeBrand, 25n * CENT);
    return E(zoe).startInstance(
      installation,
      { Price: feeIssuer },
      { minBidPrice },
    );
  };
  const { zoe, bundle, bundleCache, feeMintAccess } = t.context;
  const { instance } = await startContract({ zoe, bundle });
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  const purse1 = await faucet(500n * UNIT6);
  const purse2 = await faucet(500n * UNIT6);
  const purse3 = await faucet(500n * UNIT6);
  const {seat: seat1, proposal: proposal1} = await alice(t, zoe, instance, purse1 , ['map'], 8n* UNIT6);
  const {seat: seat2, proposal:proposal2} = await alice(t, zoe, instance, purse2, ['map'], 7n* UNIT6, false);
  const {seat: seat3, proposal:proposal3} = await alice(t, zoe, instance, purse3, ['map'], 6n* UNIT6);
  await verifyBidSeat(t, seat1, proposal1, zoe, instance, purse1,true);
  await verifyBidSeat(t, seat2, proposal2, zoe, instance, purse2,false);
  await verifyBidSeat(t, seat3, proposal3, zoe, instance, purse3,false);
});



test('bid on multiple Items', async t => {

  const startContract = async ({ zoe, bundle }) => {
    /** @type {ERef<Installation<AssetContractFn>>} */
    const installation = E(zoe).install(bundle);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const minBidPrice = AmountMath.make(feeBrand, 25n * CENT);
    return E(zoe).startInstance(
      installation,
      { Price: feeIssuer },
      { minBidPrice },
    );
  };
  const { zoe, bundle, bundleCache, feeMintAccess } = t.context;
  const { instance } = await startContract({ zoe, bundle });
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  const purse1 = await faucet(500n * UNIT6);
  const purse2 = await faucet(500n * UNIT6);
  const purse3 = await faucet(500n * UNIT6);
  const {seat: seat1, proposal: proposal1} = await alice(t, zoe, instance, purse1 , ['map'], 6n* UNIT6);
  const {seat: seat4, proposal: proposal4} = await alice(t, zoe, instance, purse1 , ['scroll'], 6n* UNIT6);
  const {seat: seat5, proposal: proposal5} = await alice(t, zoe, instance, purse2 , ['scroll'], 9n* UNIT6);
  const {seat: seat2, proposal:proposal2} = await alice(t, zoe, instance, purse2, ['map'], 7n* UNIT6, false);
  const {seat: seat3, proposal:proposal3} = await alice(t, zoe, instance, purse3, ['map'], 5n* UNIT6);
  const {seat: seat6, proposal: proposal6} = await alice(t, zoe, instance, purse3 , ['scroll'], 6n* UNIT6);
  
  await verifyBidSeat(t, seat1, proposal1, zoe, instance, purse1,false);
  await verifyBidSeat(t, seat2, proposal2, zoe, instance, purse2,true);
  await verifyBidSeat(t, seat3, proposal3, zoe, instance, purse3,false);

  await verifyBidSeat(t, seat4, proposal4, zoe, instance, purse1,false);
  await verifyBidSeat(t, seat5, proposal5, zoe, instance, purse2,true);
  await verifyBidSeat(t, seat6, proposal6, zoe, instance, purse3,false);
});
