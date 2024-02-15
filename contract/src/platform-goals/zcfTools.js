// @ts-check
import { atomicRearrange as atomicRearrangeTuples } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { mapKeywords } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';

/** @typedef {import("@agoric/zoe/src/contractSupport/atomicTransfer").TransferPart} TransferPart */

/**
 * Refine atomicRearrange to support naming the fields of transfer parts.
 *
 * @param {ZCF} zcf
 * @param { Array<TransferPartRecord | TransferPart>} transferParts
 *
 * @typedef {{
 *   from?: ZCFSeat,
 *   to?: ZCFSeat,
 *   amounts?: AmountKeywordRecord,
 *   mappedTo?: KeywordKeywordRecord
 * }} TransferPartRecord
 */
export const atomicRearrange = (zcf, transferParts) => {
  /** @type {TransferPart[]} */
  const tuples = harden(
    transferParts.map(part => {
      if (Array.isArray(part)) {
        return part;
      }
      const toAmounts = part.mappedTo
        ? mapKeywords(part.amounts, part.mappedTo)
        : undefined;
      return [part.from, part.to, part.amounts, toAmounts];
    }),
  );
  return atomicRearrangeTuples(zcf, tuples);
};
