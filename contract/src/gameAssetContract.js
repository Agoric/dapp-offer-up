/** @file Contract to mint and sell Place NFTs for a hypothetical game. */
// @ts-check

import { Far } from "@endo/far";
import { M, getCopyBagEntries } from "@endo/patterns";
import { AmountMath, AssetKind } from "@agoric/ertp/src/amountMath.js";
import { AmountShape } from "@agoric/ertp/src/typeGuards.js";
// Use the deprecated atomicRearrange API
// for compatibility with mainnet1B.
import "@agoric/zoe/exported.js";

import { makeTracer } from "./debug.js";

// Importing assert library for error handling
const { Fail, quote: q } = assert;

// Creating a tracer function for debugging purposes
const trace = makeTracer("Game", true);

/**
 * Calculates the total value of a copy bag by summing up the quantities.
 * @param {Amount<'copyBag'>} amt - The copy bag amount to calculate the value for.
 * @returns {bigint} - The total value of the copy bag.
 */
const bagValueSize = (amt) => {
  /** @type {[unknown, bigint][]} */
  // Extracting entries from the copy bag using getCopyBagEntries function
  const entries = getCopyBagEntries(amt.value);
  // Calculating the total value by summing up the quantities in entries
  const total = entries.reduce((acc, [_place, qty]) => acc + qty, 0n);
  return total;
};

/**
 * Initializes and starts the game contract.
 * @param {ZCF<{joinPrice: Amount}>} zcf - The Zoe Contract Facet for handling contracts.
 * @returns {Promise<Record<string, unknown>>} - A promise resolving to an object containing the public facet.
 */
export const start = async (zcf) => {
  // Retrieving the joinPrice from contract terms
  const { joinPrice } = zcf.getTerms();

  // Creating an empty seat for the game using the Zoe Contract Facet
  const { zcfSeat: gameSeat } = zcf.makeEmptySeatKit();
  // Creating a new mint for the 'Place' asset with COPY_BAG kind
  const mint = await zcf.makeZCFMint("Place", AssetKind.COPY_BAG);

  // Defining the shape of the join invitation
  const joinShape = harden({
    give: { Price: AmountShape },
    want: { Places: AmountShape },
    exit: M.any(),
  });

  /**
   * The function to be executed when a player joins the game.
   * @param {ZCFSeat} playerSeat - The seat representing the player in the game.
   * @returns {string} - A welcome message for the player.
   */
  const joinHook = (playerSeat) => {
    // Extracting the give and want amounts from the player's proposal
    const { give, want } = playerSeat.getProposal();
    // Logging join details for debugging
    trace("join", "give", give, "want", want.Places.value);

    // Checking if the given price is greater than or equal to the joinPrice
    AmountMath.isGTE(give.Price, joinPrice) ||
      Fail`${q(give.Price)} below joinPrice of ${q(joinPrice)}}`;

    // Checking if the number of places requested is within the allowed limit
    bagValueSize(want.Places) <= 3n || Fail`only 3 places allowed when joining`;

    // Decrementing the player's seat by the given amount and incrementing the game's seat
    // We use the deprecated stage/reallocate API
    // so that we can test this with the version of zoe on mainnet1B.
    // using atomicRearrange bloated the contract from ~1MB to ~3MB
    playerSeat.decrementBy(gameSeat.incrementBy(give));
    // Minting the wanted amount and reallocating it to the player and game seats
    const tmp = mint.mintGains(want);
    playerSeat.incrementBy(tmp.decrementBy(want));
    zcf.reallocate(playerSeat, tmp, gameSeat);

    // Exiting the player's seat with success
    playerSeat.exit(true);
    // Returning a welcome message
    return "welcome to the game";
  };

  // Creating the public facet for the game
  const publicFacet = Far("API", {
    makeJoinInvitation: () =>
      // Creating a join invitation using the joinHook function and specified shape
      zcf.makeInvitation(joinHook, "join", undefined, joinShape),
  });

  // Returning the public facet as a hardened object
  return harden({ publicFacet });
};
// Hardening the start function
harden(start);
