// @ts-check
import { atomicRearrange as atomicRearrangeTuples } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';

/** @typedef {import("@agoric/zoe/src/contractSupport/atomicTransfer").TransferPart} TransferPart */

/**
 * Refine atomicRearrange to support naming the fields of transfer parts.
 *
 * @param {ZCF} zcf
 * @param { Array<TransferPartRecord | TransferPart>} transferParts
 *
 * @typedef {{
 *   fromSeat?: ZCFSeat,
 *   toSeat?: ZCFSeat,
 *   fromAmounts?: AmountKeywordRecord,
 *   toAmounts?: AmountKeywordRecord
 * }} TransferPartRecord
 */
export const atomicRearrange = (zcf, transferParts) => {
  /** @type {TransferPart[]} */
  const tuples = harden(
    transferParts.map(part =>
      Array.isArray(part)
        ? part
        : [part.fromSeat, part.toSeat, part.fromAmounts, part.toAmounts],
    ),
  );
  return atomicRearrangeTuples(zcf, tuples);
};
