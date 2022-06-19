class ProgressBar {
  constructor(progress = 0, min = 0, max = 100) {
		this.progress = progress;
		this.min = min;
		this.max = max;
	}

	set progress(value) {
		this._progress = value;
	}

	get progress() {
		return this._progress;
	}
}

module.exports = ProgressBar;
