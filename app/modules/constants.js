const { app } = require('electron');
const path = require('path');

const documents = app.getPath('documents');
const appOptions = {
  appName: "Cismu Player",
  appNameMachine: "cismu-player",
  appVersion: "0.0.2",
  appAutor: "Gabriel Maizo <maizogabriel@gmail.com>",
}

const appConfig = require(path.join(__dirname, '../config/app.config.js'));
const appDefault = require(path.join(__dirname, '../config/app.default.config.js'));

const appPath = {
  root: path.join(documents, appOptions.appName),
  music: path.join(documents, appOptions.appName, 'My Music'),
  database: path.join(documents, appOptions.appName, `${appOptions.appNameMachine}.db`),
}

module.exports = {
  appOptions,
  appConfig,
  appDefault,
  appPath,
}


// defaultPath: path.join(app.getPath("documents"), appOptions.appName),
// musicPath: path.join("${documents}", appOptions.appName), "My Music"),
// videoPath: path.join("${documents}", appOptions.appName), "My Videos"),
// databasePath: path.join("${documents}", appOptions.appName), "database.db"),

// playlist: path.join(documents, appOptions.appName, 'Playlist'),