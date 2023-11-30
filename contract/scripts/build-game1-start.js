/**
 * @file Proposal Builder: Start Game with non-vbank Place NFT asset
 *
 * Usage:
 *   agoric run build-game1-start.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForGame1 } from '../src/start-game1-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const game1ProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../src/start-game1-proposal.js',
    getManifestCall: [
      getManifestForGame1.name,
      {
        game1Ref: publishRef(
          install(
            '../src/gameAssetContract.js',
            '../bundles/bundle-game1.js',
            { persist: true },
          ),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('start-game1', game1ProposalBuilder);
};
