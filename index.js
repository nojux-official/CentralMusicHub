const express = require('express')
const session = require('express-session');
const sqlite = require("better-sqlite3");
const crypto = require('crypto');

require('dotenv').config()

const app = express()
const port = 80

const server_address = process.env.server_address
const client_id = process.env.spotify_client_id
const client_secret = process.env.spotify_client_secret
const session_secret = process.env.session_secret

function generateCodeVerifier(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}


const getToken = async (codeVerifier, code) => {
  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: client_id,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${server_address}/api/spotify/callback`,
      code_verifier: codeVerifier,
    }),
  }

  const body = await fetch("https://accounts.spotify.com/api/token", payload);
  const response = await body.json();

  //TODO: get refresh token?

  return response.access_token
}



const SqliteStore = require("better-sqlite3-session-store")(session)
const db = new sqlite("sessions.db", { verbose: console.log });

app.use(
  session({
    secret: session_secret,
    saveUninitialized: false,
    resave: false,

    store: new SqliteStore({
      client: db, 
      expired: {
        clear: true,
        intervalMs: 900000 //ms = 15min
      }
    }),
    
  })
);
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/api", (req, res) => {
  const status = {
    "status": "success"
  };

  res.send(status);
});

app.get("/api/spotify/auth", async (req, res) => {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  req.session.user = {verifier: verifier}

  const params = new URLSearchParams();

  params.append("response_type", "code");
  params.append("client_id", client_id);
  params.append("scope", "user-read-private user-read-email");
  params.append("code_challenge", challenge);
  params.append("code_challenge_method", "S256");
  params.append("redirect_uri", `${server_address}/api/spotify/callback`);

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get("/api/spotify/callback", async (req, res) => {
  var code = req.query.code;
  var verifier = req.session.user.verifier;

  const accessToken = await getToken(verifier, code);

  req.session.user = {access_token: accessToken};

  const status = {
    "status": "success",
    "access_token": accessToken
  };

  res.send(status);
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})