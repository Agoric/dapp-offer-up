/**
 * @file Agoric to Discord gateway
 */
// @ts-check

//
// https://medium.com/@orels1/using-discord-oauth2-a-simple-guide-and-an-example-nodejs-app-71a9e032770
import express from 'express';
import url from 'url';

/** @param {string} ref */
const asset = ref => url.fileURLToPath(new URL(ref, import.meta.url));

const app = express();

app.get('/', (req, res) => {
  res.status(200).sendFile(asset('./index.html'));
});

app.listen(50451, () => {
  console.info('Running on port 50451');
});
