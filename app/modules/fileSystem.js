const fs = require("fs");

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
}

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
}

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
}

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
}

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
}

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
}


module.exports = {
  listFiles,
  readFile,
  deleteFile,
  deleteFolder,
  createFolder,
  exists
}