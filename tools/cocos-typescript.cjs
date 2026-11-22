const path = require('node:path');
const fs = require('node:fs');
const creator = process.env.COCOS_CREATOR_ROOT || 'C:/ProgramData/cocos/editors/Creator/3.8.8';
const location = path.join(creator, 'resources/app.asar.unpacked/node_modules/typescript');
if (!fs.existsSync(location)) throw new Error('Set COCOS_CREATOR_ROOT to your Cocos Creator 3.8.8 installation.');
module.exports = require(location);
