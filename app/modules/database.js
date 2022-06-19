const sqlite3 = require("sqlite3").verbose();
const constants = require("./constants");

class Database {
  constructor(dbName = undefined) {
    if (!dbName) dbName = constants.appPath.database;
    this.db = new sqlite3.Database(dbName);
  }

  createTable(tableName, columns) {
    this.db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`);
  }

  insert(tableName, columns, values) {
    this.db.run(`INSERT INTO ${tableName} (${columns}) VALUES (${values})`);
  }

  select(tableName, columns, where) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT ${columns} FROM ${tableName} WHERE ${where}`,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  update(tableName, columns, values, where) {
    this.db.run(
      `UPDATE ${tableName} SET ${columns} = ${values} WHERE ${where}`
    );
  }

  delete(tableName, where) {
    this.db.run(`DELETE FROM ${tableName} WHERE ${where}`);
  }

  close() {
    this.db.close();
  }

  run(sql) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Database;
