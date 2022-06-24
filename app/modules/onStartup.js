const Database = require("./database");
const { exists, createFolder } = require("./fileSystem");
const constants = require("./constants");

const bootstrapTest = async () => {
  try {
    console.log("bootstrapTest");
    let root = constants.appPath.root;
    let music = constants.appPath.music;
    let database = constants.appPath.database;

    if (exists(root) && exists(music) && exists(database)) {
      return false;
    } else if (!exists(root) || !exists(music) || !exists(database)) {
      await createFolder(root);
      await createFolder(music);
      let db = await new Database();
      await db.close();
      return true;
    }
  } catch (error) {
    console.log(error);
    return;
  }
};

module.exports = {
  bootstrapTest,
};
