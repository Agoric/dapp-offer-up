import { Far } from '@endo/far';

const greet = who => `Hello, ${who}!`;

export const start = () => {
  const publicFacet = Far('Hello', { greet });
  return { publicFacet };
};
