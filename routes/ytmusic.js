const express = require('express');
const { google } = require('googleapis');
const { yt_request_all_playlists, isTokenValid } = require('../lib/yt_api');
const config = require('../config');

const router = express.Router();

router.get("/auth", async (req, res) => {
    var OAuth2 = google.auth.OAuth2;
    var oauth2Client = new OAuth2(config.youtube.client_id, config.youtube.client_secret, `${config.server_address}/api/ytmusic/callback`);
  
    var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
  
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
  
    res.redirect(authUrl);
  });
  
  router.get("/callback", async (req, res) => {
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
  
  router.get("/list", async (req, res) => {
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
  
  router.get("/status", async (req, res) => {
    const expiry_date = req.session.user?.yt_access_token?.expiry_date;
  
    const status = {
      "authetificated": isTokenValid(expiry_date),
      "expiry_date": expiry_date
    };
  
    res.send(status);
  });
  
  module.exports = router;
  