// @ts-check
import '@endo/init';
import test from 'ava';
import { E } from '@endo/far';
import * as access from '../src/access.contract.js';

test('access control', async t => {
  const { publicFacet, creatorFacet } = access.start();
  t.is(await E(publicFacet).get(), 'Hello, World!');
  await t.throwsAsync(E(publicFacet).set(2), { message: /no method/ });
  await E(creatorFacet).set(2);
  t.is(await E(publicFacet).get(), 2);
});
