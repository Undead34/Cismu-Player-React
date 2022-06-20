import { Progress } from "semantic-ui-react";
import React from "react";

/**
 * @param {String} props.progressBarEvent
 */
class ProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      percent: 0,
    };
  }

  componentDidMount() {
    this.receiveID = window.api.receive(this.props.progressBarEvent, (data) => {
      this.completedUpdate(data);
    });
  }

  componentWillUnmount() {
    this.receiveID = null;
  }

  completedUpdate(completed) {
    this.setState({
      percent: completed
    });
  }

  render() {
    return (
      <Progress percent={this.state.percent}></Progress>
    );
  }
}

export default ProgressBar;
