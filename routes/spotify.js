const express = require('express');
const { generateCodeVerifier, generateCodeChallenge, getToken, fetchProfile, fetchPlaylists } = require('../lib/spotify_api');
const config = require('../config');

const router = express.Router();

router.get("/auth", async (req, res) => {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);
  
    req.session.user.spotify_verifier = verifier;
  
    const params = new URLSearchParams();
  
    params.append("response_type", "code");
    params.append("client_id", config.spotify.client_id);
    params.append("scope", "user-read-private user-read-email");
    params.append("code_challenge", challenge);
    params.append("code_challenge_method", "S256");
    params.append("redirect_uri", `${config.server_address}/api/spotify/callback`);
  
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });
  
  router.get("/callback", async (req, res) => {
    var code = req.query.code;
    var verifier = req.session.user.spotify_verifier;
  
    const accessToken = await getToken(verifier, code);
  
    req.session.user.spotify_access_token = accessToken;
  
    const status = {
      "status": "success",
      "access_token": accessToken
    };
  
    res.send(status);
  });
  
  router.get("/list", async (req, res) => {
    var accessToken = req.session.user.spotify_access_token;
  
    var profile = await fetchProfile(accessToken);
    var user_id = profile.id;
  
    var playlists = await fetchPlaylists(user_id, accessToken);
  
    const status = {
      "status": "success",
      "playlists": playlists
    };
  
    res.send(status);
  });

  module.exports = router;
  