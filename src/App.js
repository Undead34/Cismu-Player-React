import React, { useState } from 'react';
import ProgressBar from "./components/progress-bar.component";
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  window.api.receive("progress-bar", (progress)=>{
    console.log(progress)
    setCount(progress);
  })

  return (
    <div className="App">
      <ProgressBar key="0" bgcolor="#6a1b9a" completed={count} />
    </div>
  );
}

export default App;
