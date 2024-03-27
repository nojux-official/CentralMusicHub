const express = require('express')
const session = require('express-session');
const sqlite = require("better-sqlite3");
const path = require('path');

const config = require('./config');
const spotify_routes = require('./routes/spotify');
const ytmusic_routes = require('./routes/ytmusic');

const app = express();


// SESSION
// Initialize session storage
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

// Add the middleware function inline to be executed for every request
// This ensures that req.session.user is always available
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = {};
  }
  next();
});


//ROUTES
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/api", (req, res) => {
  const status = {
    "status": "success"
  };

  res.send(status);
});

// Serves API requests that are defined in /routes
app.use('/api/spotify', spotify_routes);
app.use('/api/ytmusic', ytmusic_routes);

// Serves static files from /static folder
app.use('/static/', express.static(path.join(__dirname, 'static')));


app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}`)
})