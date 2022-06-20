import "./track-metadata.component.css";
import React from "react";


class TrackMetadata extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="track-metadata">
        <div className="track-image">
          <img size="tiny" src={this.props.image} alt="music" />
        </div>
        <div className="content">
          <div className="track-title">{this.props.name}</div>
          <div className="track-artist">{this.props.artist}</div>
          <div className="track-album">{this.props.album}</div>
        </div>
      </div>
    );
  }
}

export default TrackMetadata;
