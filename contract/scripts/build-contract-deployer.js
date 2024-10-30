/**
 * @file Permission Contract Deployment builder
 *
 * Creates files for starting an instance of the contract:
 * * contract source and instantiation proposal bundles to be published via
 *   `agd tx swingset install-bundle`
 * * start-med-rec-permit.json and start-med-rec.js to submit the
 *   instantiation proposal via `agd tx gov submit-proposal swingset-core-eval`
 *
 * Usage:
 *   agoric run build-contract-deployer.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForpatientData } from '../src/med-rec-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const patientDataProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../src/med-rec-proposal.js',
    getManifestCall: [
      getManifestForpatientData.name,
      {
        patientDataRef: publishRef(
          install(
            '../src/med-rec-contract.js',
            '../bundles/bundle-med-rec.js',
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
  await writeCoreProposal('start-med-rec', patientDataProposalBuilder);
};
