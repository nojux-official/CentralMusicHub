const express = require('express')
const app = express()
const port = 80

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/api", (req, res) => {
  const status = {
     "status": "success"
  };
  
  res.send(status);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})