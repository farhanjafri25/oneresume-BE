const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Sets the Puppeteer cache directory to a local folder within the project workspace
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
