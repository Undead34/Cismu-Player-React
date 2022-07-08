const { app } = require("electron");
const path = require("path");

const supportedFormats = ["mp3", "ogg", "wav", "flac", "m4a", "wma", "aac"];
const music = app.getPath("music");
const home = app.getPath("home");

const appConfig = require(path.join(__dirname, "../config/app.config.js"));
const appDefault = require(path.join(__dirname, "../config/app.default.config.js"));

const appOptions = {
  appName: "Cismu Player",
  appVersion: "0.0.2",
  appAutor: "Gabriel Maizo <maizogabriel@gmail.com>",
};

const appPath = {
  home: path.join(home, ".Cismu-Player"),
  music: music,
};

module.exports = {
  appConfig,
  appDefault,
  appOptions,
  appPath,
  supportedFormats,
};
