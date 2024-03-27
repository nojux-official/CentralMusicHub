const express = require('express')
const session = require('express-session');
const sqlite = require("better-sqlite3");
const { google } = require('googleapis');
const path = require('path');
const config = require('./config');
const { youtube } = require('googleapis/build/src/apis/youtube');
const spotify_routes = require('./routes/spotify');
const { yt_request_all_playlists, isTokenValid } = require('./lib/yt_api');

const app = express();

const SqliteStore = require("better-sqlite3-session-store")(session)
const db = new sqlite("sessions.db", { verbose: console.log });

app.use(
  session({
    secret: config.session_secret,
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

app.use('/api/spotify', spotify_routes);

app.get("/api/ytmusic/auth", async (req, res) => {
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2(config.youtube.client_id, config.youtube.client_secret, `${config.server_address}/api/ytmusic/callback`);

  var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  res.redirect(authUrl);
});

app.get("/api/ytmusic/callback", async (req, res) => {
  var OAuth2 = google.auth.OAuth2;
  var oauth2Client = new OAuth2(config.youtube.client_id, config.youtube.client_secret, `${config.server_address}/api/ytmusic/callback`);

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
  var oauth2Client = new OAuth2(config.youtube.client_id, config.youtube.client_secret, `${config.server_address}/api/ytmusic/callback`);
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

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}`)
})