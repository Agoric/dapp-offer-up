#!/usr/bin/env node

// Simple test to verify contract syntax and basic imports
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';

console.log('Testing basic imports...');
console.log('makeDurableZone:', typeof makeDurableZone);
console.log('M:', typeof M);
console.log('Basic imports work!');