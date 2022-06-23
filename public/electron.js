const { bootstrapTest } = require("../app/modules/onStartup");
const { app, BrowserWindow, ipcMain, session } = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const fs = require("fs");

// IPC main events listeners
const listenEvents = async () => {
  let eventPath = path.join(__dirname, "../app/events");

  const eventFiles = (await fs.readdirSync(eventPath)).filter((file) =>
    file.endsWith(".js")
  );

  for (const file of eventFiles) {
    const event = require(`../app/events/${file}`);
    if (event.once) {
      if (event.handle)
        ipcMain.handleOnce(event.name, (...args) => event.execute(...args));
      else ipcMain.once(event.name, (...args) => event.execute(...args));
    } else {
      if (event.handle)
        ipcMain.handle(event.name, (...args) => event.execute(...args));
      else ipcMain.on(event.name, (...args) => event.execute(...args));
    }
    delete require.cache[require.resolve(`../app/events/${file}`)]; // delete cache
  }

  return true;
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minHeight: 600,
    minWidth: 785,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  if (isDev) {
    const reactDevToolsPath = path.join(
      app.getPath("home"),
      "AppData/Local/Google/Chrome/User Data/Profile 3/Extensions/fmkadmapgofadopljbjfkapdkoienihi/4.24.7_0"
    );
    session.defaultSession.loadExtension(reactDevToolsPath);
    mainWindow.webContents.openDevTools();
  }
  
  bootstrapTest();
  listenEvents();
  mainWindow.on("closed", () => (mainWindow = null));

  if (!isDev) mainWindow.removeMenu();
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
