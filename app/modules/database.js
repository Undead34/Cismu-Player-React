const sqlite3 = require("better-sqlite3");
const constants = require("./constants");

class Database {
  constructor(dbName = undefined) {
    if (!dbName) dbName = constants.appPath.database;
    this.db = new sqlite3(dbName, { verbose: console.log });
  }

  async init() {
    let sql = `
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY,
        name TEXT,
        artist TEXT,
        album TEXT,
        path TEXT,
        duration INTEGER,
        size INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );`;

    await this.run(sql);
  }

  async insert(song) {
    let sql = `
    INSERT INTO songs ( name, artist, album, path, duration, size, created_at, updated_at)
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ?);`;

    let created_at = new Date().getTime();
    let updated_at = created_at;

    let values = [
      song.name,
      song.artist,
      song.album,
      song.path,
      song.duration,
      song.size,
      created_at,
      updated_at,
    ];

    await this.run(sql, values);
  }

  run(sql) {
    return this.db.prepare(sql).run();
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
