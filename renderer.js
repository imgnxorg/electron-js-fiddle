/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const React = () => import("react");
const { createRoot } = () => import("react-dom/client");
const App = () => import("./app.js");
// import "./print.css";
// import "./bulma-theme.css";
// import "./styles.css";

const root = createRoot(document.getElementById("root"));

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);



