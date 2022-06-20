import ProgressBar from "./components/progress-bar.component";
import React from "react";
import "./App.css";

function App() {
  return (
    <div className="App">
      <ProgressBar bgcolor="#ef6c00" progressBarEvent="progress"/>
    </div>
  );
}

export default App;

/*
window.api.invoke("get-local-sounds", {
  eventName: "progress",
  min: 0,
  max: 100,
  progress: 0
})
*/