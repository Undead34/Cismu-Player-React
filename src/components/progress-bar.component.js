import React from "react";

class ProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      completed: 0,
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
      completed: completed
    });
  }

  render() {
    const containerStyles = {
      height: 20,
      width: "100%",
      backgroundColor: "#e0e0de",
      borderRadius: 50,
      margin: 0,
    };

    const fillerStyles = {
      height: "100%",
      width: `${this.state.completed}%`,
      backgroundColor: this.props.bgcolor,
      borderRadius: "inherit",
      transition: "width 1s ease-in-out",
      textAlign: "right",
    };

    const labelStyles = {
      padding: 5,
      color: "white",
      fontWeight: "bold",
    };

    return (
      <div style={containerStyles}>
        <div style={fillerStyles}>
          <span style={labelStyles}>{`${this.state.completed}%`}</span>
        </div>
      </div>
    );
  }
}

export default ProgressBar;
