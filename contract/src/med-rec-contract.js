// @ts-check

import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import '@agoric/zoe/exported.js';

/**
 * @typedef {{
 *   maxPatients: bigint;
 * }} PatientTerms
 */

export const meta = {
  customTermsShape: M.splitRecord({
    maxPatients: M.bigint(),
  }),
};

/**
 * @param {ZCF<PatientTerms>} zcf
 */
export const start = async (zcf, privateArgs) => {
  const { maxPatients } = zcf.getTerms();

  // Create storage node for patient data
  const patientDataRoot = await E(privateArgs.storageNode).makeChildNode('patients');
  
  // Get marshaller for data serialization
  const marshaller = await E(privateArgs.board).getPublishingMarshaller();

  /**
   * Store patient data in VStorage
   * @param {string} patientId 
   * @param {object} data 
   */
  const storePatientData = async (patientId, data) => {
    const patientNode = await E(patientDataRoot).makeChildNode(patientId);
    const marshalledData = JSON.stringify(await E(marshaller).toCapData(data));
    await E(patientNode).setValue(marshalledData);
  };

  /**
   * Validate patient data structure
   * @param {object} data 
   */
  const validatePatientData = (data) => {
    const requiredFields = [
      'patientId',
      'name',
      'age',
      'gender',
      'bloodType',
    ];

    return requiredFields.every(field => 
      Object.prototype.hasOwnProperty.call(data, field) && 
      data[field] !== null && 
      data[field] !== undefined
    );
  };

  const proposalShape = harden({
    exit: M.any(),
    give: M.any(),
    want: M.any(),
  });

  /**
   * Handle publishing of patient data
   * @param {ZCFSeat} seat 
   * @param {object} offerArgs 
   */
  const publishHandler = async (seat, offerArgs) => {
    const { patientData } = offerArgs;

    if (!validatePatientData(patientData)) {
      console.error('Invalid patient data structure');
      seat.fail(new Error('Invalid patient data structure'));
      return;
    }

    try {
      // Store the patient data
      await storePatientData(patientData.patientId, patientData);
      
      seat.exit();
      return 'Patient data published successfully';
    } catch (error) {
      console.error('Error publishing patient data:', error);
      seat.fail(new Error('Failed to publish patient data'));
    }
  };

  const makePublishInvitation = () =>
    zcf.makeInvitation(
      publishHandler,
      'publish patient data',
      undefined,
      proposalShape,
    );

  return harden({
    publicFacet: Far('Patient Data Public Facet', {
      makePublishInvitation,
    }),
  });
};

harden(start);