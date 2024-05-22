// @ts-check
import '@endo/init';
import test from 'ava';
import { E } from '@endo/far';
import { start } from '../src/hello.contract.js';

test('contract greets by name', async t => {
  const { publicFacet } = start();
  const actual = await E(publicFacet).greet('Bob');
  t.is(actual, 'Hello, Bob!');
});
