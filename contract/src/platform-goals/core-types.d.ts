import type { Zone } from '@agoric/zone';

// XXX how to import types from @agoric/vats?
// cf. https://github.com/Agoric/agoric-sdk/blob/master/packages/vats/src/core/types-ambient.d.ts
type Board = { getId: (key: unknown) => string };

type WellKnown = {
  asset: 'BLD' | 'IST';
  contract: 'VaultFactory' | 'FeeDistributor';
};

// TODO: include AssetKind { IST: 'nat', ... }
type AssetsSpace<T extends string> = {
  brand: PromiseSpaceOf<Record<T, Brand>>;
  issuer: PromiseSpaceOf<Record<T, Issuer>>;
};

// TODO: include contract start function types
type ContractSpace<T extends string> = {
  installation: PromiseSpaceOf<Record<T, Installation>>;
  instance: PromiseSpaceOf<Record<T, Instance>>;
};

type WellKnownSpaces = AssetsSpace<WellKnown['asset']> &
  ContractSpace<WellKnown['contract']>;

type BootstrapSpace = PromiseSpaceOf<{
  chainStorage: StorageNode;
  board: Board;
  startUpgradable: (...args: unknown[]) => any;
  zoe: ZoeService;
}>;

type BootstrapPowers = BootstrapSpace &
  WellKnownSpaces & {
    zone: Zone;
  };

type Producer<T> = {
  resolve: (v: ERef<T>) => void;
  reject: (r: unknown) => void;
  reset: (reason?: unknown) => void;
};

/**
 * @template B - Bidirectional
 * @template C - Consume only
 * @template P - Produce only
 */
type PromiseSpaceOf<B, C = {}, P = {}> = {
  consume: { [K in keyof (B & C)]: Promise<(B & C)[K]> };
  produce: { [K in keyof (B & P)]: Producer<(B & P)[K]> };
};

type BootstrapManifestPermit =
  | true
  | string
  | { [key: string]: BootstrapManifestPermit };
