const { exists, createFolder } = require("./fileSystem");
const constants = require("./constants");

const bootstrapTest = async () => {
  let root = constants.appPath.root;
  let music = constants.appPath.music;
  let database = constants.appPath.database;

  if (exists(root) && exists(music) && exists(database)) {
    return false;
  } else if (!exists(root) || !exists(music) || !exists(database)) {
    await createFolder(root);
    await createFolder(music);
    
    return true;
  }
};

module.exports = bootstrapTest;
