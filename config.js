require('dotenv').config();

const config = {
    port: process.env.PORT || 80,
    server_address: process.env.SERVER_ADDRESS,
    spotify: {
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    },
    session_secret: process.env.SESSION_SECRET,
    youtube: {
      client_id: process.env.YT_CLIENT_ID,
      client_secret: process.env.YT_CLIENT_SECRET
    }
  };
  
  module.exports = config;
