// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from "./prepare-test-env-ava.js";
import path from "path";

import * as bundleSourceAmbient from "@endo/bundle-source";

import { E } from "@endo/far";
import { AmountMath } from "@agoric/ertp";
import { makeZoeKitForTest } from "@agoric/zoe/tools/setup-zoe.js";

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractPath = `${dirname}/../src/gameAssetContract.js`;

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async () => {
  const { default: bundleSource } = bundleSourceAmbient;
  return { bundleSource };
};

test.before(async (t) => (t.context = await makeTestContext()));
test("zoe - mint payments", async (t) => {
  const { bundleSource } = t.context;
  const { zoeService: zoe } = await makeZoeKitForTest();

  // pack the contract
  const bundle = await bundleSource(contractPath);

  // install the contract
  const installation = E(zoe).installBundleID(bundle);

  const { creatorFacet, instance } = await E(zoe).startInstance(installation);

  // Alice makes an invitation for Bob that will give him 1000 tokens
  const invitation = E(creatorFacet).makeInvitation();

  // Bob makes an offer using the invitation
  const seat = E(zoe).offer(invitation);

  const paymentP = E(seat).getPayout("Token");

  // Let's get the tokenIssuer from the contract so we can evaluate
  // what we get as our payout
  const publicFacet = E(zoe).getPublicFacet(instance);
  const tokenIssuer = E(publicFacet).getTokenIssuer();
  const tokenBrand = await E(tokenIssuer).getBrand();

  const tokens1000 = AmountMath.make(tokenBrand, 1000n);
  const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(paymentP);

  // Bob got 1000 tokens
  t.deepEqual(tokenPayoutAmount, tokens1000);
});
