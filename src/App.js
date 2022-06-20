import PlayingBar from "./components/playing-bar.component"
import MusicsPlaylistTrack from "./components/musics-playlist-track.component"
import React from "react";
import "./App.css";

function App() {
  return (
    <div className="App">
      
      <PlayingBar></PlayingBar>
      <MusicsPlaylistTrack></MusicsPlaylistTrack>
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