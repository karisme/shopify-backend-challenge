// Script that runs at yarn start,
// updates secret used to sign and validate JWT tokens

/**
 * Small script that stores JSON Web Token Decoding Key configured by you 
 * into config file.
 */

const fs = require('fs-extra');

const rawData = {
    jwt: {
        secret: process.env.JWTSECRET
    }
};

const readyData = JSON.stringify(rawData);
fs.writeFileSync('config.json', readyData);
