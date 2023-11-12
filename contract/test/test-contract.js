// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';
import url from 'url';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/far';
import { makeCopyBag } from '@endo/patterns';
import { AmountMath } from '@agoric/ertp';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import centralSupplyBundle from '@agoric/vats/bundles/bundle-centralSupply.js';
import { mintStablePayment } from './mintStable.js';

/** @param {string} ref */
const asset = ref => url.fileURLToPath(new URL(ref, import.meta.url));

const contractPath = asset(`../src/gameAssetContract.js`);

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const UNIT6 = 1_000_000n;
const CENT = UNIT6 / 100n;

/**
 * Facilities such as zoe are assumed to be available.
 *
 * @param {unknown} _t
 */
const makeTestContext = async _t => {
  const bundle = await bundleSource(contractPath);
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();

  const centralSupply = await E(zoe).install(centralSupplyBundle);

  const stableIssuer = await E(zoe).getFeeIssuer();

  /** @param {bigint} value */
  const faucet = async value => {
    const pmt = await mintStablePayment(value, {
      centralSupply,
      feeMintAccess,
      zoe,
    });

    const purse = await E(stableIssuer).makeEmptyPurse();
    await E(purse).deposit(pmt);
    return purse;
  };

  return { zoe, bundle, faucet };
};

test.before(async t => (t.context = await makeTestContext()));

test('buy some game places', async t => {
  const { zoe, bundle, faucet } = t.context;

  /** as agreed by BLD staker governance */
  const startContract = async () => {
    const installation = E(zoe).install(bundle);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const joinPrice = AmountMath.make(feeBrand, 25n * CENT);
    const { instance } = await E(zoe).startInstance(
      installation,
      { Price: feeIssuer },
      { joinPrice },
    );
    return instance;
  };

  /**
   * @param {ERef<Instance>} instance
   * @param {Purse} purse
   */
  const alice = async (
    instance,
    purse,
    choices = ['Park Place', 'Boardwalk'],
  ) => {
    const publicFacet = E(zoe).getPublicFacet(instance);
    // @ts-expect-error Promise<Instance> seems to work
    const terms = await E(zoe).getTerms(instance);
    const { issuers, brands, joinPrice } = terms;

    const proposal = {
      give: { Price: joinPrice },
      want: {
        Places: AmountMath.make(
          brands.Place,
          makeCopyBag(choices.map(name => [name, 1n])),
        ),
      },
    };
    const toJoin = E(publicFacet).makeJoinInvitation();
    const pmt = await E(purse).withdraw(joinPrice);

    t.log('give', joinPrice);
    const seat = E(zoe).offer(toJoin, proposal, { Price: pmt });
    const places = await E(seat).getPayout('Places');

    const actual = await E(issuers.Place).getAmountOf(places);
    t.log('payout', actual);
    t.deepEqual(actual, proposal.want.Places);
  };

  const instance = startContract();
  await alice(instance, await faucet(5n * UNIT6));
});
