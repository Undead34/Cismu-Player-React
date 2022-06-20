module.exports = {
  name: "get-local-sounds",
  once: false,
  handle: true,
  async execute(event) {
    
  },
};

/*
const { BrowserWindow } = require("electron");
const ProgressBar = require("../modules/progress-bar");

data = data[0];
const webContents = event.sender;
const window = BrowserWindow.fromWebContents(webContents);
const progressBar = new ProgressBar(window, data.eventName, data.min, data.max, data.progress);

let a = setInterval(() => {
  progressBar.progress += 10;
}, 1000);

setTimeout(() => {
  clearInterval(a);
}, 11000);
*/