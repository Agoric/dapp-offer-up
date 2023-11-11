/**
 * @file Agoric to Discord gateway
 *
 * TODO:
 * LINKED ROLES VERIFICATION URL
 * You can configure a verification URL to enable your application as a requirement in a server role's Links settings
 */
// @ts-check

// https://medium.com/@orels1/using-discord-oauth2-a-simple-guide-and-an-example-nodejs-app-71a9e032770
import express from 'express'; // XXX ambient

const port = 50451;

const app = express(); // XXX static mutable

app.get('/', (request, response) => {
  return response.sendFile('index.html', { root: './src/' });
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`),
);
