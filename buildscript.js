// Script that runs at yarn start,
// updates secret used to sign and validate JWT tokens

const fs = require('fs-extra');

const rawData = fs.readFileSync('config.json');
const parsedData = JSON.parse(rawData);
parsedData["jwt"]["secret"] = process.env.TEST;
const readyData = JSON.stringify(parsedData);
fs.writeFileSync('config.json', readyData);
