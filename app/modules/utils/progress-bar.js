class ProgressBar {
  constructor(window=null, eventName='progress', min = 0, max = 100, progress = 0) {
		this.progress = progress;
		this.min = min;
		this.max = max;
		this.window = window;
		this.eventName = eventName;
	}

	set progress(value) {
		this._progress = value;
		if (this.window) this.window.webContents.send(this.eventName, this._progress);
	}

	get progress() {
		return this._progress;
	}
}

module.exports = ProgressBar;
