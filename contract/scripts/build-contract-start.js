/**
 * @file Proposal Builder: Start Game with non-vbank Place NFT asset
 *
 * Usage:
 *   agoric run build-game1-start.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifest } from '../src/start-offer-items.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const proposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../src/start-offer-items.js',
    getManifestCall: [
      getManifest.name,
      {
        offerItemsRef: publishRef(
          install('../src/offerItems.js', '../bundles/bundle-offerItems.js', {
            persist: true,
          }),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('start-contract', proposalBuilder);
};
