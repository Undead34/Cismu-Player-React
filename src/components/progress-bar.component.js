import React from "react";


const containerStyles = {
  height: 20,
  width: '100%',
  backgroundColor: "#e0e0de",
  borderRadius: 50,
  margin: 0
}

const fillerStyles = {
  height: '100%',
  width: `0%`,
  backgroundColor: '#fff',
  borderRadius: 'inherit',
  textAlign: 'right',
  transition: 'width 1s ease-in-out',
}

const labelStyles = {
  padding: 5,
  color: 'white',
  fontWeight: 'bold'
}

class ProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      completed: 0,
      bgcolor: props.bgcolor,
      textcolor: props.textcolor,
    };
  }

  render() {
    return (
      <div style={containerStyles}>
        <div style={fillerStyles}>
          <span
            style={labelStyles}
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {`${0}%`}
          </span>
        </div>
      </div>
    );
  }
}

export default ProgressBar;
