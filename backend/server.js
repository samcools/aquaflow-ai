'use strict';

const { httpApp } = require('./http');

const port = Number(process.env.PORT || 8000);
const server = httpApp.listen(port, () => {
  console.log(`AquaFlow AI listening on http://localhost:${port}`);
});

module.exports = { server };
