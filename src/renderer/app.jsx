// src/renderer/App.jsx
import React from "react";

window.api.send("toMain", "Hello from renderer!");
window.api.receive("fromMain", (data) => {
  console.log("Received:", data);
});

const App = () => {
  return (
    <div>
      <code>src</code>
      <div className="bg-zinc-50 text-center">
        Here we go! Now we&apos;re cookin&apos;!
      </div>
    </div>
  );
};

export default App;
