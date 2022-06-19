const { BrowserWindow } = require("electron");
const ProgressBar = require('../modules/progress-bar');

module.exports = {
	name: 'get-local-sounds',
	once: false,
	handle: true,
	async execute(event) {
    const progressBar = new ProgressBar();
		const webContents = event.sender;
		const window = BrowserWindow.fromWebContents(webContents);

		let a = setInterval(() => {
			progressBar.progress += 10;
			window.webContents.send('progress-bar', progressBar.progress);
		}, 1000);

		setTimeout(() => {
			clearInterval(a);
		}, 11000);
	},
};