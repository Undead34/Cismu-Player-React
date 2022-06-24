const sqlite3 = require("sqlite3").verbose();
const constants = require("./constants");

class Database {
  constructor(dbName = undefined) {
    if (!dbName) dbName = constants.appPath.database;
    this.db = new sqlite3.Database(dbName);
  }

  init() {
    return new Promise(() => {
      let songsTable = `CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        album TEXT,
        year INTEGER,
        genre TEXT,
        path TEXT,
        duration INTEGER,
        size INTEGER,
        hash TEXT,
        picture BLOB,
        create_at TEXT,
        update_at TEXT)`;

      let headerTable = `CREATE TABLE IF NOT EXISTS header (
          num_songs INTEGER,
          app_version TEXT,
          database_version TEXT)`;

      this.db.serialize(() => {
        this.db.run(songsTable);
        this.db.run(headerTable);
      });
    });
  }

  addMusic(song) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO songs (id, title, artist, album, year, genre, path, duration, size, hash, picture, create_at, update_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          song.id,
          song.title,
          song.artist,
          song.album,
          song.year,
          song.genre,
          song.path,
          song.duration,
          song.size,
          song.hash,
          song.picture,
          song.create_at,
          song.update_at,
        ],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  update(song) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE songs SET title = ?, artist = ?, album = ?, year = ?, genre = ?, path = ?, duration = ?, size = ?, update_at = ? WHERE id = ?`,
        [
          song.title,
          song.artist,
          song.album,
          song.year,
          song.genre,
          song.path,
          song.duration,
          song.size,
          song.updated_at,
          song.id,
        ],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM songs WHERE id = ?`, [id], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM songs`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM songs WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  clearAllMusic() {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM songs`, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;

/*
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
        create_at INTEGER,
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

  async update(song) {
    let sql = `UPDATE songs SET
      name = ?, artist = ?, album = ?, path = ?,
      duration = ?, size = ?, updated_at = ?
    WHERE id = ?;`;

    let updated_at = new Date().getTime();

    let values = [
      song.name,
      song.artist,
      song.album,
      song.path,
      song.duration,
      song.size,
      updated_at,
      song.id,
    ];

    await this.run(sql, values);
  }

  async delete(id) {
    let sql = `DELETE FROM songs WHERE id = ?;`;
    await this.run(sql, [id]);
  }

  async getAll() {
    let sql = `SELECT * FROM songs;`;
    let rows = await this.db.prepare(sql).all();
    return rows;
  }

  async getById(id) {
    let sql = `SELECT * FROM songs WHERE id = ?;`;
    let row = await this.db.prepare(sql).get(id);
    return row;
  }

  run(sql) {
    return this.db.prepare(sql).run();
  }

  close() {
    this.db.close();
  }
*/
