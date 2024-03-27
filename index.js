const express = require('express')
const session = require('express-session');
const sqlite = require("better-sqlite3");
const { google } = require('googleapis');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

require('dotenv').config()

const app = express()
const port = 80

const server_address = process.env.server_address
const spotify_client_id = process.env.spotify_client_id
const spotify_client_secret = process.env.spotify_client_secret
const session_secret = process.env.session_secret
const yt_client_id = process.env.yt_client_id
const yt_client_secret = process.env.yt_client_secret

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
  const digest = await crypto.createHash('sha256').update(data).digest();
  const base64Digest = digest.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64Digest;
}


const getToken = async (codeVerifier, code) => {
  const payload = new URLSearchParams({
    client_id: spotify_client_id,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${server_address}/api/spotify/callback`,
    code_verifier: codeVerifier,
  });

  try {
    const response = await axios.post("https://accounts.spotify.com/api/token", payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // TODO: Check for errors in the response

    // TODO: Get refresh token if needed

    return response.data.access_token;
  } catch (error) {
    console.error('Axios Error:', error);
    throw error; // You might want to handle the error appropriately in your application
  }
};



async function fetchProfile(token) {
  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Check for errors in the response
    if (response.data.error) {
      throw new Error(`Spotify API error: ${response.data.error.message}`);
    }

    return response.data;
  } catch (error) {
    console.error('Axios Error:', error);
    throw error; // Handle the error appropriately in your application
  }
}

async function fetchPlaylists(user_id, token) {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Check for errors in the response
    if (response.data.error) {
      throw new Error(`Spotify API error: ${response.data.error.message}`);
    }

    return response.data;
  } catch (error) {
    console.error('Axios Error:', error);
    throw error; // Handle the error appropriately in your application
  }
}

async function yt_request_all_playlists(auth) {
  const service = google.youtube('v3');

  return new Promise((resolve, reject) => {
    service.playlists.list({
      auth: auth,
      part: 'snippet,contentDetails',
      mine: true
    }, (err, response) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err);
        return;
      }

      const playlists = response.data.items;
      resolve(playlists);
    });
  });
}

function isTokenValid(expiryDate) {
  const currentTime = new Date().getTime(); //in milliseconds

  return expiryDate > currentTime;
}

// Example usage
const expiryDate = 1710598240771; // Replace this with your expiry date
const isValid = isTokenValid(expiryDate);
console.log('Is token valid?', isValid);



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

app.use('/static/', express.static(path.join(__dirname, 'static')));

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

  req.session.user = { verifier: verifier }

  const params = new URLSearchParams();

  params.append("response_type", "code");
  params.append("client_id", spotify_client_id);
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

  req.session.user = { access_token: accessToken };

  const status = {
    "status": "success",
    "access_token": accessToken
  };

  res.send(status);
});

app.get("/api/spotify/list", async (req, res) => {
  var accessToken = req.session.user.access_token;

  var profile = await fetchProfile(accessToken);
  var user_id = profile.id;

  var playlists = await fetchPlaylists(user_id, accessToken);

  const status = {
    "status": "success",
    "playlists": playlists
  };

  res.send(status);
});

app.get("/api/ytmusic/auth", async (req, res) => {
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2(yt_client_id, yt_client_secret, `${server_address}/api/ytmusic/callback`);

  var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  res.redirect(authUrl);
});

app.get("/api/ytmusic/callback", async (req, res) => {
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2(yt_client_id, yt_client_secret, `${server_address}/api/ytmusic/callback`);

  var code = req.query.code;

  const { tokens } = await oauth2Client.getToken(code);

  req.session.user = { yt_access_token: tokens };

  const status = {
    "status": "success",
    "access_token": tokens.access_token,
  };

  res.send(status);
});

app.get("/api/ytmusic/list", async (req, res) => {
  var accessToken = req.session.user.yt_access_token;
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2(yt_client_id, yt_client_secret, `${server_address}/api/ytmusic/callback`);
  oauth2Client.credentials = accessToken;

  var playlists = await yt_request_all_playlists(oauth2Client);

  const status = {
    "status": "success",
    "playlists": playlists
  };

  res.send(status);
});

app.get("/api/ytmusic/status", async (req, res) => {
  const expiry_date = req.session.user?.yt_access_token?.expiry_date;

  const status = {
    "authetificated": isTokenValid(expiry_date),
    "expiry_date": expiry_date
  };

  res.send(status);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})