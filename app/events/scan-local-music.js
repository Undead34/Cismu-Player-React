const { getLocalMusic } = require('../modules/utils/localMusic.js');

module.exports = {
  name: "scan-local-music",
  once: false,
  handle: false,
  async execute(event) {
    getLocalMusic();
  }
};