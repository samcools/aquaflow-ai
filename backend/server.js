'use strict';

const { app } = require('./app');

const port = Number(process.env.PORT || 8000);
const server = app.listen(port, () => {
  console.log(`AquaFlow AI listening on http://localhost:${port}`);
});

module.exports = { server };
