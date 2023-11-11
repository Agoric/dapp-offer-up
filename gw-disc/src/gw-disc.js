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
import url from 'url';
import btoa from 'btoa';

/** @param {string} ref */
const asset = ref => url.fileURLToPath(new URL(ref, import.meta.url));

const app = express(); // XXX: static mutable

app.get('/', (req, res) => {
  res.status(200).sendFile('index.html', { root: './src/' });
});

const router = express.Router(); // XXX: static mutable
app.use('/api/discord', router);

// hint: use https://direnv.net/
const CLIENT_ID = process.env.CLIENT_ID; // XXX: ambient: process
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const redirect = encodeURIComponent(
  'http://localhost:50451/api/discord/callback',
);

router.get('/login', (req, res) => {
  res.redirect(
    `https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`,
  );
});

// async/await error catcher
const catchAsync = fn => (req, res, next) => {
  const routePromise = fn(req, res, next);
  if (routePromise.catch) {
    routePromise.catch(err => next(err));
  }
};

router.get(
  '/callback',
  catchAsync(async (req, res) => {
    if (!req.query.code) throw new Error('NoCodeProvided');
    const code = req.query.code;
    const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch(
      `https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${creds}`,
        },
      },
    );
    const json = await response.json();
    res.redirect(`/?token=${json.access_token}`);
  }),
);

app.use((err, req, res, next) => {
  switch (err.message) {
    case 'NoCodeProvided':
      return res.status(400).send({
        status: 'ERROR',
        error: err.message,
      });
    default:
      return res.status(500).send({
        status: 'ERROR',
        error: err.message,
      });
  }
});

const port = 50451;
app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`),
);
