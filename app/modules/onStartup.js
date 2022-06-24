const Database = require("./database");
const { exists, createFolder } = require("./fileSystem");
const constants = require("./constants");

const bootstrapTest = async () => {
  try {
    let root = constants.appPath.root;
    let music = constants.appPath.music;
    let database = constants.appPath.database;

    if (await exists(root) && await exists(music) && await exists(database)) {
      console.log("bootstrapTest: OK");
      return false;
    } else if (!await exists(root) || !await exists(music) || !await exists(database)) {
      console.log("Creating folders...");
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
