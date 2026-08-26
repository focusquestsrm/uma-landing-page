'use strict';

const fs = require('fs');
const path = require('path');

const key = String(process.env.GOOGLE_MAPS_BROWSER_KEY || '').trim();
if (key && !/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) throw new Error('GOOGLE_MAPS_BROWSER_KEY has an invalid format.');

const target = path.join(__dirname, '..', 'src', 'js', 'runtime-config.js');
const output = `window.UMA_RUNTIME_CONFIG = Object.freeze({ googleMapsBrowserKey: ${JSON.stringify(key)} });\n`;
fs.writeFileSync(target, output, 'utf8');
console.log(key ? 'Generated browser runtime configuration.' : 'Generated browser runtime configuration without Google Places.');
