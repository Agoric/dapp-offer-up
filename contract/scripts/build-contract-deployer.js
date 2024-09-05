/**
 * @file Permission Contract Deployment builder
 *
 * Creates files for starting an instance of the contract:
 * * contract source and instantiation proposal bundles to be published via
 *   `agd tx swingset install-bundle`
 * * start-real-estate-permit.json and start-real-estate.js to submit the
 *   instantiation proposal via `agd tx gov submit-proposal swingset-core-eval`
 *
 * Usage:
 *   agoric run build-contract-deployer.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForRealEstate } from '../src/real-estate-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const realEstateProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../src/real-estate-proposal.js',
    getManifestCall: [
      getManifestForRealEstate.name,
      {
        realEstateRef: publishRef(
          install(
            '../src/real-estate.contract.js',
            '../bundles/bundle-real-estate.js',
            {
              persist: true,
            },
          ),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('start-real-estate', realEstateProposalBuilder);
};
