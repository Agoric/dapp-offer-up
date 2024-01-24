/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test } from './prepare-test-env-ava.js';
import { execa } from 'execa';
import { promises as fs } from 'fs';

test('proposal builder generates bundles less than 5MB', async t => {
  const { stdout } = await execa('agoric', [
    'run',
    'scripts/build-contract-deployer.js',
  ]);
  t.log('agoric run stdout:', stdout);
  t.truthy(stdout, 'Proposal successfully bundled.');

  const regex = /agd tx swingset install-bundle @(.*?)\.json/g;
  const bundles = Array.from(stdout.matchAll(regex), m => `${m[1]}.json`);

  for (const bundle of bundles) {
    const { size } = await fs.stat(bundle);
    t.assert(size);
    const sizeInMb = size / (1024 * 1024);
    t.assert(sizeInMb < 5, `Bundle ${bundle} is less than 5MB`);
    t.log({
      bundleId: bundle.split('cache/')[1].split('.json')[0],
      fileSize: `${sizeInMb} MB`,
    });
  }
});
