import { Progress, Grid, Button, Input, Segment } from "semantic-ui-react";
import TrackMetadata from "./track/track-metadata.component";
import reactImage from "../static/images/logo512.png";
import "./playing-bar.component.css";
import React from "react";

class PlayingBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Segment className="playing-bar-root">
        <Grid>
          <Grid.Column width={16}>
            <Progress percent={50} size="tiny"></Progress>
          </Grid.Column>

          <Grid.Column width={4}>
            <TrackMetadata
              name="Miku 39!"
              artist="Hatsune Miku"
              album="Magical Mirai"
              image={reactImage}
            />
          </Grid.Column>

          <Grid.Column textAlign="center" width={8}>
            <div className="playing-bar-controls">
              <Button icon="shuffle" />
              <Button icon="step backward" />
              <Button className="play-pause-button" circular icon="play" />
              <Button icon="step forward" />
              <Button icon="redo" />
            </div>
          </Grid.Column>

          <Grid.Column width={4}>
            <div>
              <Input type="range" />
            </div>
          </Grid.Column>
        </Grid>
      </Segment>
    );
  }
}

export default PlayingBar;

/*
        <Segment>
            <Grid.Column width={12}>
              <Grid>
                <Grid.Column width={11}>

                </Grid.Column>
                <Grid.Column width={5}>
<Button icon="heart outline" />
<Button icon="external" />
<Input type="range" />
                </Grid.Column>
              </Grid>
            </Grid.Column>
          </Grid>
        </Segment>
*/
