// src/renderer/App.jsx
import React from "react";

declare global {
  interface Window {
    api?: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (data: any) => void) => void;
    };
  }
}
// import window from "../types.d.ts";
if (window?.api) {
  window?.api?.send("toMain", "Hello from renderer!");
  window?.api?.receive("fromMain", (data) => {
    console.log("Received:", data);
  });
}

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
