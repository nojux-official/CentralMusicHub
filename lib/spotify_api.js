const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

function generateCodeVerifier(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
exports.generateCodeVerifier = generateCodeVerifier;

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.createHash('sha256').update(data).digest();
  const base64Digest = digest.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64Digest;
}
exports.generateCodeChallenge = generateCodeChallenge;
const getToken = async (codeVerifier, code) => {
  const payload = new URLSearchParams({
    client_id: config.spotify.client_id,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.server_address}/api/spotify/callback`,
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
exports.getToken = getToken;



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
exports.fetchProfile = fetchProfile;

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
exports.fetchPlaylists = fetchPlaylists;
