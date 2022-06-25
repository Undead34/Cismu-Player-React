const { appPath, supportedFormats } = require("../constants");
const getMp3Duration = require("get-mp3-duration");
const fileSystem = require("../fileSystem");
const jsmediatags = require("jsmediatags");
const Database = require("../database");
const crypto = require("crypto");
const path = require("path");

// get the metadata of the music, I am using buffers to read the file only once
const getMetaData = async (buffer) => {
  return new Promise((resolve) => {
    new jsmediatags.Reader(buffer)
      .setTagsToRead(["title", "artist", "album", "picture", "year", "genre"])
      .read({
        onSuccess: function (tag) {
          resolve(tag.tags);
        },
        onError: function (error) {
          console.log(":(", error.type, error.info);
          resolve({});
        },
      });
  });
};

const fullScanMusic = async () => {
  const db = new Database();
  db.clearAllMusic();

  let musics = await fileSystem.listFiles(appPath.music);
  let musicFiles = [];
  for (let music of musics) {
    for (let format of supportedFormats) {
      if (music.endsWith(format)) {
        musicFiles.push(music);
      }
    }
  }

  for (let musicFile of musicFiles) {
    let musicPath = path.join(appPath.music, musicFile);
    let bufferMusic = await fileSystem.readFile(musicPath);

    let music = {};
    let musicMetaData = await getMetaData(bufferMusic);

    music.id = await crypto.randomUUID();
    music.title = musicMetaData.title;
    music.artist = musicMetaData.artist;
    music.album = musicMetaData.album;
    music.year = musicMetaData.year;
    music.picture = musicMetaData.picture;
    music.genre = musicMetaData.genre;
    music.path = musicPath;
    music.duration = path.extname(musicFile) === ".mp3"
      ? await getMp3Duration(bufferMusic)
      : 0;
    music.size = await fileSystem.getFileSize(musicPath);
    music.hash = await crypto
      .createHash("md5")
      .update(bufferMusic)
      .digest("hex");

    if (musicMetaData.picture) {
      let imageBuffer = Buffer.from(musicMetaData.picture.data);
      let imageCompress = await fileSystem.compressImage(imageBuffer);
      if (imageCompress) music.picture = imageCompress;
      else music.picture = imageBuffer;
    } else {
      music.picture = null;
    }

    music.create_at = await new Date().toISOString();
    music.update_at = await new Date().toISOString();
    await db.addMusic(music);
  }

  await db.close();

  return musicFiles;
};

module.exports = {
  fullScanMusic,
};
