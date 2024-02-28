const express = require('express')
const querystring = require('querystring');
require('dotenv').config()

const app = express()
const port = 80

const server_address = process.env.server_address
const client_id = process.env.spotify_client_id
const client_secret = process.env.spotify_client_secret

function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
}
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/api", (req, res) => {
  const status = {
     "status": "success"
  };
  
  res.send(status);
});

app.get("/api/spotify/auth", (req, res) => {
  var state = generateRandomString(16);
  var scope = 'user-read-private user-read-email';
  var redirect_uri = server_address + '/api/spotify/callback'

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get("/api/spotify/callback", (req, res) => {
  const status = {
    "status": "success"
 };
 
 res.send(status);
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})