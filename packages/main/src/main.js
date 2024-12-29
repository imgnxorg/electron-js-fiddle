const { app, BrowserWindow } = require("electron");
// const path = require("path");
const chalk = () => import("chalk");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: true,
    },
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
          ].join("; "),
        },
      });
    },
  );

  // In development, load from dev server
  console.log(chalk.yellow(process.env.NODE_ENV));
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    // Open the DevTools automatically
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile("dist/index.html");
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("web-contents-created", (event, contents) => {
    // Disable navigation
    contents.on("will-navigate", (event) => {
      event.preventDefault();
    });

    // Disable new window creation
    contents.setWindowOpenHandler(() => {
      return { action: "deny" };
    });
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
