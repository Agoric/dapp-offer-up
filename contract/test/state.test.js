// @ts-check
import '@endo/init';
import test from 'ava';
import { E } from '@endo/far';
import * as state from '../src/state.contract.js';

test('state', async t => {
  const { publicFacet } = state.start();
  const actual = await E(publicFacet).getRoomCount();
  t.is(actual, 0);
  await E(publicFacet).makeRoom(2);
  t.is(await E(publicFacet).getRoomCount(), 1);
});
