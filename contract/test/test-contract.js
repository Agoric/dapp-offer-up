/**
 * @file Test basic trading using the gameAssetContract.
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
import { startGameContract } from '../src/start-game1-proposal.js';

/** @typedef {typeof import('../src/gameAssetContract.js').start} GameContractFn */

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/gameAssetContract.js`);

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
  const bundle = await bundleCache.load(contractPath, 'gameAssetContract');

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
  const terms = { joinPrice: AmountMath.make(money.brand, 5n) };
  t.log('terms:', terms);

  /** @type {ERef<Installation<GameContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);
  t.log(instance);
  t.is(typeof instance, 'object');
});

/**
 * Alice joins the game by paying the price from the contract's terms.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {ZoeService} zoe
 * @param {ERef<import('@agoric/zoe/src/zoeService/utils').Instance<GameContractFn>} instance
 * @param {Purse} purse
 */
const alice = async (
  t,
  zoe,
  instance,
  purse,
  choices = ['Park Place', 'Boardwalk'],
) => {
  const publicFacet = E(zoe).getPublicFacet(instance);
  // @ts-expect-error Promise<Instance> seems to work
  const terms = await E(zoe).getTerms(instance);
  const { issuers, brands, joinPrice } = terms;

  const choiceBag = makeCopyBag(choices.map(name => [name, 1n]));
  const proposal = {
    give: { Price: joinPrice },
    want: { Places: AmountMath.make(brands.Place, choiceBag) },
  };
  const pmt = await E(purse).withdraw(joinPrice);
  t.log('Alice gives', proposal.give);
  // #endregion makeProposal

  const toJoin = E(publicFacet).makeJoinInvitation();

  const seat = E(zoe).offer(toJoin, proposal, { Price: pmt });
  const places = await E(seat).getPayout('Places');

  const actual = await E(issuers.Place).getAmountOf(places);
  t.log('Alice payout brand', actual.brand);
  t.log('Alice payout value', actual.value);
  t.deepEqual(actual, proposal.want.Places);
};

test('Alice trades: give some play money, want some game places', async t => {
  const { zoe, bundle } = t.context;

  const money = makeIssuerKit('PlayMoney');
  const issuers = { Price: money.issuer };
  const terms = { joinPrice: AmountMath.make(money.brand, 5n) };

  /** @type {ERef<Installation<GameContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);
  t.log(instance);
  t.is(typeof instance, 'object');

  const alicePurse = money.issuer.makeEmptyPurse();
  const amountOfMoney = AmountMath.make(money.brand, 10n);
  const moneyPayment = money.mint.mintPayment(amountOfMoney);
  alicePurse.deposit(moneyPayment);
  await alice(t, zoe, instance, alicePurse);
});

test('Trade in IST rather than play money', async t => {
  /**
   * Start the contract, providing it with
   * the IST issuer.
   *
   * @param {{ zoe: ZoeService, bundle: {} }} powers
   */
  const startContract = async ({ zoe, bundle }) => {
    /** @type {ERef<Installation<GameContractFn>>} */
    const installation = E(zoe).install(bundle);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const joinPrice = AmountMath.make(feeBrand, 25n * CENT);
    return E(zoe).startInstance(
      installation,
      { Price: feeIssuer },
      { joinPrice },
    );
  };

  const { zoe, bundle, bundleCache, feeMintAccess } = t.context;
  const { instance } = await startContract({ zoe, bundle });
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  await alice(t, zoe, instance, await faucet(5n * UNIT6));
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
        produce: { Place: sync.brand },
      },
      issuer: {
        consume: { IST: pFor(feeIssuer) },
        produce: { Place: sync.issuer },
      },
      installation: { consume: { game1: sync.installation.promise } },
      instance: { produce: { game1: sync.instance } },
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
  await startGameContract(powers);
  const instance = await sync.instance.promise;

  // Now that we have the instance, resume testing as above.
  const { feeMintAccess, bundleCache } = t.context;
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  await alice(t, zoe, instance, await faucet(5n * UNIT6));
});
