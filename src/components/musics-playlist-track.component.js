import { Icon } from "semantic-ui-react";
import React from "react";

class MusicsPlaylistTrack extends React.Component {
  constructor(props) {
    super(props);
    this.state = {}
  }

  render() {
    return (
      <div className="musics-playlist-track">
        <Icon disabled name='chevron up' />
      </div>
    );
  }
}

export default MusicsPlaylistTrack;