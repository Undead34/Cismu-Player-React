const sqlite3 = require("sqlite3").verbose();
const constants = require("./constants");

class Database {
  constructor(dbName = undefined) {
    if (!dbName) dbName = constants.appPath.database;
    this.db = new sqlite3.Database(dbName);
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY, title TEXT, artist TEXT, album TEXT, year INTEGER, genre TEXT, path TEXT, duration INTEGER, size INTEGER, created_at INTEGER, updated_at INTEGER)`,
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  insert(song) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO songs (title, artist, album, year, genre, path, duration, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          song.title,
          song.artist,
          song.album,
          song.year,
          song.genre,
          song.path,
          song.duration,
          song.size,
          song.created_at,
          song.updated_at,
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
        `UPDATE songs SET title = ?, artist = ?, album = ?, year = ?, genre = ?, path = ?, duration = ?, size = ?, updated_at = ? WHERE id = ?`,
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
