const { google } = require('googleapis');

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
exports.yt_request_all_playlists = yt_request_all_playlists;
function isTokenValid(expiryDate) {
  const currentTime = new Date().getTime(); //in milliseconds

  return expiryDate > currentTime;
}
exports.isTokenValid = isTokenValid;
