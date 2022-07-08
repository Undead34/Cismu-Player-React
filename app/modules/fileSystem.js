const sharp = require("sharp");
const zlib = require("zlib");
const fs = require("fs");
var path = require("path");

/**
 * Compress o file by path or buffer
 * @param {*} path path to compress
 * @returns buffer compressed
 */
const compress = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      if (typeof path === "string") {
        let data = fs.readFileSync(path);
        let compressed = zlib.deflateSync(data);
        resolve(compressed);
      } else {
        let compressed = zlib.deflateSync(path);
        resolve(compressed);
      }
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * descompress a file by path or buffer
 * @param {*} path path to descompress
 * @returns buffer descompressed
 */
const descompress = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      if (typeof path === "string") {
        let data = fs.readFileSync(path);
        let inflated = zlib.inflateSync(data);
        resolve(inflated);
      } else {
        let inflated = zlib.inflateSync(path);
        resolve(inflated);
      }
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * Remove recursively a folder
 * @param {*} path path to remove folder
 * @returns null
 */
const deleteFolder = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      fs.rmdirSync(path, { recursive: true });
      resolve();
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * Create a folder
 * @param {string} path path to create
 * @returns null
 */
const createFolder = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      fs.mkdirSync(path, { recursive: true });
      resolve();
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * Validate if a file or folder exists
 * @param {string} path path to validate
 * @returns boolean
 */
const exists = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      let exists = fs.existsSync(path);
      resolve(exists);
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * Read data from file
 * @param {string} path path file to read
 * @returns data readed
 */
const readFile = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      let data = fs.readFileSync(path);
      resolve(data);
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * List files in a folder
 * @param {string} path path to list directory
 * @returns array of files
 */
const listFiles = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      let files = fs.readdirSync(path);
      resolve(files);
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * Remove a file
 * @param {*} path path to remove file
 * @returns null
 */
const deleteFile = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      fs.unlinkSync(path);
      resolve();
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

const getFileSize = (path) => {
  return new Promise((resolve, rejects) => {
    try {
      let stats = fs.statSync(path);
      resolve(stats.size);
    } catch (error) {
      console.log(error.message);
      rejects();
    }
  });
};

/**
 * Compress image by buffer
 * @param {*} buffer buffer to compress
 * @returns buffer compressed
 */

const compressImage = async (buffer) => {
  try {
    let compressed = await sharp(buffer)
      .resize(300, 300)
      .jpeg({ quality: 60 })
      .toBuffer();
    return compressed;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const RecursiveDirectoryScanning = (dir, callback) => {
  var results = [];

  fs.readdir(dir, function (err, list) {
    if (err) return callback(err);

    for (let x = 0; x < list.length; x++) {
      let file = list.length[x];

      if (!file) return callback(null, results);
      file = path.resolve(dir, file);

      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          RecursiveDirectoryScanning(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    }
  });
};

RecursiveDirectoryScanning(process.env.HOME, function (err, results) {
  if (err) throw err;
  console.log(results);
});

module.exports = {
  listFiles,
  readFile,
  deleteFile,
  deleteFolder,
  createFolder,
  exists,
  getFileSize,
  compress,
  descompress,
  compressImage,
};
