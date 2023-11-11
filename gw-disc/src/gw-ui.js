// @ts-check

/** @type {<T>(x: T | null | undefined) => T} */
export const NonNullish = x => {
  if (x === undefined || x === null) {
    throw new Error('NonNullish');
  }
  return x;
};

/** @param {string} hash */
export const parseAuthInfo = hash => {
  const fragment = new URLSearchParams(hash.slice(1));
  const [accessToken, tokenType] = [
    fragment.get('access_token'),
    fragment.get('token_type'),
  ];

  return { accessToken, tokenType };
};

/**
 * @param {{ accessToken: string; tokenType: string }} authInfo
 * @param {{ fetch: typeof window.fetch}} io
 */
export const getUserInfo = ({ accessToken, tokenType }, { fetch }) => {
  return fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `${tokenType} ${accessToken}`,
    },
  })
    .then(result => result.json())
    .then(response => {
      console.log({ response });
      return response;
    })
    .catch(console.error);
};
