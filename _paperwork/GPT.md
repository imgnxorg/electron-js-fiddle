Last login: Sat Dec 28 19:32:25 on ttys001
❯  chat
❯ q chat

Hi, I'm Amazon Q. I can answer questions about your shell and CLI tools!
You can include additional context by adding the following to your prompt:

@history to pass your shell history
@git to pass information about your current git repository
@env to pass your shell environment

> How do I import contextBridge API in an Electron.js app to maximize the Node.js polyfills? Also, should I be using React-Native instead of React?

Let me help you with implementing contextBridge in Electron.js. [1]

For Electron apps, using contextBridge is the recommended secure way to expose 
Node.js APIs to your renderer process. Here's how to implement it properly:

1. First, create a preload script (preload.js):

javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    // Expose specific Node.js functionality you need
    send: (channel, data) => {
        // Whitelist channels you want to allow
        const validChannels = ['toMain', 'windowControl']
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },
    receive: (channel, func) => {
        const validChannels = ['fromMain', 'windowResponse']
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
    }
})


2. Configure your main process (main.js):

javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    
    win.loadFile('index.html')
}

app.whenReady().then(createWindow)


3. To use the exposed APIs in your renderer process:

javascript
// In your renderer JavaScript
window.api.send('toMain', 'Hello from renderer!')
window.api.receive('fromMain', (data) => {
    console.log('Received:', data)
})


Regarding React Native vs React for Electron:
• Stick with React (not React Native) for Electron apps
• React Native is designed for mobile development and would add unnecessary 
complexity
• React works perfectly with Electron and has better desktop-specific component 
support
• The ecosystem of React + Electron is more mature and has better tooling 
support

Best practices:
1. Always use contextIsolation: true
2. Explicitly whitelist the channels you want to expose
3. Keep the exposed API surface minimal
4. Validate all data passed between processes
5. Use TypeScript for better type safety (optional but recommended)

Remember to handle cleanup in your renderer process by removing any listeners 
when components unmount to prevent memory leaks.

If you're using TypeScript, you'll want to declare the types for your window API
:

typescript
declare global {
    interface Window {
        api: {
            send: (channel: string, data: any) => void;
            receive: (channel: string, func: (...args: any[]) => void) => void;
        }
    }
}



1 https://stackoverflow.com/questions/67579650

> Why are we disabling NodeIntegration?

We disable nodeIntegration for security reasons, particularly to prevent 
potential Cross-Site Scripting (XSS) attacks and unauthorized access to Node.js 
APIs. Here's a detailed explanation: [1]

1. Security Risks with nodeIntegration enabled:
javascript
// With nodeIntegration: true, malicious code could do this:
const { exec } = require('child_process')
exec('rm -rf /*') // Dangerous system-level access
// Or access file system
const fs = require('fs')
fs.readFile('/path/to/sensitive/data')


2. The secure approach using contextBridge:
javascript
// preload.js - Controlled exposure of specific features
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('secureApi', {
    // Only expose what you need
    readConfig: async (configPath) => {
        // Implement validation and safety checks
        if (!isValidConfigPath(configPath)) {
            throw new Error('Invalid config path')
        }
        // Controlled file access
        return await safeReadConfig(configPath)
    }
})


Key reasons for disabling nodeIntegration:

1. Principle of Least Privilege
• Only expose the minimum necessary functionality
• Prevent unauthorized access to system resources
• Control what renderer processes can do

2. Protection against:
• Remote code execution
• Unauthorized file system access
• System command execution
• Network request tampering

3. Better separation of concerns:
javascript
// main.js
const { BrowserWindow } = require('electron')

const mainWindow = new BrowserWindow({
    webPreferences: {
        nodeIntegration: false,        // Disable direct Node.js access
        contextIsolation: true,        // Enable context isolation
        sandbox: true,                 // Enable sandboxing
        preload: path.join(__dirname, 'preload.js')
    }
})


4. Safe pattern for IPC communication:
javascript
// preload.js
contextBridge.exposeInMainWorld('safeIpc', {
    sendMessage: (message) => {
        // Validate message
        if (typeof message !== 'string') {
            throw new Error('Invalid message type')
        }
        // Safe IPC communication
        ipcRenderer.send('validated-channel', message)
    }
})

// renderer.js (your web code)
window.safeIpc.sendMessage('Hello') // Safe, controlled communication


This approach:
• Creates a clear security boundary
• Prevents direct access to Node.js APIs
• Allows explicit control over what functionality is available
• Reduces the attack surface significantly
• Makes the application more maintainable and secure

Remember: If you're loading any remote content (like external websites) in your 
Electron app, having nodeIntegration disabled is especially crucial as it 
prevents potentially malicious remote code from accessing Node.js capabilities.

1 https://stackoverflow.com/questions/54469481

> Uncaught SyntaxError: Unexpected token '<' When rendering React in Electron.

This error typically occurs when your Electron app isn't properly loading or 
bundling React files. Here's how to fix it:

1. First, ensure your HTML file is correctly configured:

html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Your Electron App</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- In development, point to your webpack dev server -->
    <!-- In production, point to the bundled file -->
    <script src="./build/js/app.js"></script>
  </body>
</html>


2. Set up Webpack configuration:

javascript
// webpack.config.js
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/renderer/index.jsx',
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'build/js'),
    filename: 'app.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};


3. Update your main Electron process:

javascript
// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the correct URL based on environment
  if (isDev) {
    win.loadURL('http://localhost:3000'); // Webpack dev server URL
  } else {
    win.loadFile('index.html');
  }
}

app.whenReady().then(createWindow);


4. Set up your package.json scripts:

json
{
  "scripts": {
    "start": "concurrently \"npm run start:webpack\" \"npm run start:electron\"",
    "start:webpack": "webpack serve --hot",
    "start:electron": "wait-on http://localhost:3000 && electron .",
    "build": "webpack --config webpack.config.js && electron-builder",
    "dev": "NODE_ENV=development npm start"
  },
  "devDependencies": {
    "@babel/core": "^7.x.x",
    "@babel/preset-react": "^7.x.x",
    "@babel/preset-env": "^7.x.x",
    "babel-loader": "^8.x.x",
    "webpack": "^5.x.x",
    "webpack-cli": "^4.x.x",
    "webpack-dev-server": "^4.x.x",
    "concurrently": "^6.x.x",
    "wait-on": "^6.x.x",
    "electron": "^x.x.x",
    "electron-builder": "^x.x.x"
  }
}


5. Create your React entry point:

jsx
// src/renderer/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);


6. Basic App component:

jsx
// src/renderer/App.jsx
import React from 'react';

const App = () => {
  return (
    <div>
      <h1>Hello from React + Electron!</h1>
    </div>
  );
};

export default App;


7. For development, add a webpack dev server configuration:

javascript
// webpack.dev.config.js
const config = require('./webpack.config');

module.exports = {
  ...config,
  devServer: {
    static: {
      directory: path.join(__dirname, 'build'),
    },
    port: 3000,
    hot: true
  }
};


Common troubleshooting steps if you still see the error:

1. Check network tab in DevTools:
javascript
// main.js
function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      devTools: true // Ensure DevTools are enabled
    }
  });
  win.webContents.openDevTools(); // Open DevTools automatically
}


2. Verify file paths are correct:
javascript
// main.js
console.log('App path:', app.getAppPath());
console.log('__dirname:', __dirname);


3. Check if webpack is building correctly:
bash
# In your terminal
npm run build -- --verbose


Remember to install all necessary dependencies:
bash
npm install --save-dev @babel/core @babel/preset-react @babel/preset-env babel-loader webpack webpack-cli webpack-dev-server electron electron-builder
npm install react react-dom


This setup provides a development environment with hot reloading and a 
production build process. The error should be resolved once these configurations
are properly in place.

> [1] App path: /Users/donaldmoore/Library/Mobile Documents/com~apple~CloudDocs/_____CONTAINERS/Electron.js
[1] __dirname: /Users/donaldmoore/Library/Mobile Documents/com~apple~CloudDocs/_____CONTAINERS/Electron.js
[1] 2024-12-28 20:34:24.045 Electron[43949:289868] +[IMKClient subclass]: chose IMKClient_Modern
[1] 2024-12-28 20:34:24.045 Electron[43949:289868] +[IMKInputSession subclass]: chose IMKInputSession_Modern
[1] (node:43949) electron: Failed to load URL: http://localhost:3000/ with error: ERR_CONNECTION_REFUSED

The error indicates that the webpack dev server isn't running when Electron 
tries to connect to it. Let's fix this by properly setting up the development 
environment. [1]

1. First, modify your package.json to ensure proper startup sequence:

json
{
  "scripts": {
    "start": "electron .",
    "dev": "concurrently -k \"BROWSER=none npm run react-start\" \"npm run electron-wait\"",
    "react-start": "webpack serve --config webpack.config.js",
    "electron-wait": "wait-on tcp:3000 && electron .",
    "build": "webpack --config webpack.config.js"
  }
}


2. Update your webpack.config.js for development:

javascript
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/renderer/index.jsx',
  target: 'web', // Changed from electron-renderer for dev server
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    hot: true,
    static: {
      directory: path.join(__dirname, 'public')
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};


3. Update your main.js:

javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open the DevTools automatically (optional)
  mainWindow.webContents.openDevTools();

  // In development, use the hosted version
  if (isDev) {
    console.log('Loading development server...');
    mainWindow.loadURL('http://localhost:3000');
  } else {
    console.log('Loading production build...');
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


4. Create a basic public/index.html:

html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Electron + React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="bundle.js"></script>
  </body>
</html>


5. Make sure your project structure looks like this:

your-app/
├── package.json
├── webpack.config.js
├── main.js
├── preload.js
├── public/
│   └── index.html
└── src/
    └── renderer/
        ├── index.jsx
        └── App.jsx


6. Install necessary dependencies if you haven't:

bash
npm install --save-dev concurrently wait-on webpack webpack-cli webpack-dev-server @babel/core @babel/preset-react @babel/preset-env babel-loader
npm install --save react react-dom


7. To run the application in development:

bash
npm run dev


This command will:
1. Start the webpack dev server
2. Wait for the server to be available
3. Launch Electron

If you're still seeing connection refused errors:

1. Check if port 3000 is available:
bash
lsof -i :3000


2. Try changing the port in webpack.config.js if 3000 is in use:
javascript
devServer: {
  port: 3001, // or another available port
  // ... other config
}


Then update your main.js and package.json scripts to use the new port number.

Remember to kill any existing processes that might be using port 3000 before 
starting the development server. The concurrently script with the -k flag should
help manage the processes, but you might need to manually kill them if 
something goes wrong:

bash
killall node    # Only if needed to kill hanging processes
npm run dev     # Start fresh



1 https://stackoverflow.com/questions/74246860

> I'm using yarn, not npm

Let's adjust the configuration for Yarn. Here's the corrected setup:

1. Update package.json scripts for Yarn:

json
{
  "scripts": {
    "start": "electron .",
    "dev": "concurrently -k \"BROWSER=none yarn react-start\" \"yarn electron-wait\"",
    "react-start": "webpack serve --config webpack.config.js",
    "electron-wait": "wait-on tcp:3000 && electron .",
    "build": "webpack --config webpack.config.js"
  }
}


2. Install dependencies using Yarn:

bash
# Dev dependencies
yarn add -D electron electron-builder webpack webpack-cli webpack-dev-server
yarn add -D @babel/core @babel/preset-react @babel/preset-env babel-loader
yarn add -D concurrently wait-on

# Production dependencies
yarn add react react-dom


3. Create or update .yarnrc.yml (if you're using Yarn 2+):

yaml
nodeLinker: node-modules


4. The rest of your configuration files remain the same (webpack.config.js, 
main.js, etc.), but to run the application:

bash
yarn dev


If you encounter any issues with dependencies, you can try:

bash
# Clear yarn cache
yarn cache clean

# Remove existing dependencies
rm -rf node_modules
rm yarn.lock

# Reinstall everything
yarn install


For Yarn workspaces (if you're using a monorepo structure):

json
{
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "yarn workspace electron-app dev"
  }
}


To check for outdated packages with Yarn:

bash
yarn outdated


To upgrade packages:

bash
yarn upgrade-interactive --latest


Remember to use yarn instead of npm for all package management commands. The 
application functionality remains the same, we're just using Yarn's package 
management instead of npm's.

> Where do I put the Yarn Workspace file?

The Yarn workspace configuration goes in the root package.json of your project. 
Here's how to structure it: [1]

your-project/
├── package.json           # Root workspace package.json
├── packages/
│   ├── main/             # Electron main process
│   │   ├── package.json
│   │   ├── main.js
│   │   └── preload.js
│   └── renderer/         # React renderer process
│       ├── package.json
│       ├── src/
│       │   ├── index.jsx
│       │   └── App.jsx
│       ├── public/
│       │   └── index.html
│       └── webpack.config.js
└── .yarnrc.yml


1. Root package.json:
json
{
  "private": true,
  "name": "your-electron-app",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently -k \"yarn workspace renderer dev\" \"yarn workspace main dev\"",
    "build": "yarn workspace renderer build && yarn workspace main build"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}


2. packages/main/package.json:
json
{
  "name": "main",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wait-on tcp:3000 && electron .",
    "build": "electron-builder"
  },
  "dependencies": {
    "electron": "^28.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0",
    "wait-on": "^7.0.0"
  }
}


3. packages/renderer/package.json:
json
{
  "name": "renderer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "webpack serve --config webpack.config.js",
    "build": "webpack --config webpack.config.js"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.0.0",
    "@babel/preset-react": "^7.0.0",
    "@babel/preset-env": "^7.0.0",
    "babel-loader": "^9.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0",
    "webpack-dev-server": "^4.0.0"
  }
}

I'm sorry, I am unable to respond further. Perhaps we could find another topic 
to discuss?

1 https://docs.aws.amazon.com/codeartifact/latest/ug/npm-yarn.html

> What goes into the package.json file for the renderer process?

Here's a comprehensive package.json setup for the renderer process:

json
{
  "name": "electron-react-renderer",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-react": "^7.22.0",
    "@babel/preset-typescript": "^7.23.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "babel-loader": "^9.1.0",
    "css-loader": "^6.8.0",
    "style-loader": "^3.3.0",
    "typescript": "^5.2.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.0",
    "webpack-dev-server": "^4.15.0"
  },
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "browserslist": {
    "production": [
      "last 2 chrome version",
      "last 2 firefox version",
      "last 2 safari version"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "babel": {
    "presets": [
      "@babel/preset-env",
      "@babel/preset-react",
      "@babel/preset-typescript"
    ]
  }
}


Optional but recommended additions for a more complete setup:

json
{
  "devDependencies": {
    // Add these for linting
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",

    // Add these for testing
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.6.0",
    "@types/jest": "^29.5.0",

    // Add these for styling
    "sass": "^1.69.0",
    "sass-loader": "^13.3.0",
    "postcss": "^8.4.0",
    "postcss-loader": "^7.3.0",
    "autoprefixer": "^10.4.0"
  },
  "scripts": {
    // Additional useful scripts
    "test": "jest",
    "test:watch": "jest --watch",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,scss}\"",
    "analyze": "webpack-bundle-analyzer stats.json"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": [
      "@testing-library/jest-dom"
    ],
    "moduleNameMapper": {
      "\\.(css|less|scss)$": "identity-obj-proxy"
    }
  }
}


For TypeScript configuration, include a tsconfig.json in the same directory:

json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}


For path aliases (optional but helpful), add to tsconfig.json:

json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"],
      "@styles/*": ["styles/*"],
      "@assets/*": ["assets/*"]
    }
  }
}


Remember to:

1. Keep your renderer dependencies separate from main process dependencies
2. Use appropriate version numbers for your needs
3. Consider adding peer dependencies if needed
4. Add any specific dependencies your project requires
5. Update browserslist config based on your target platforms

The exact dependencies you'll need might vary based on your specific 
requirements, but this provides a solid foundation for a React-based Electron 
renderer process.

> echo :
❯ q chat

Hi, I'm Amazon Q. I can answer questions about your shell and CLI tools!
You can include additional context by adding the following to your prompt:

@history to pass your shell history
@git to pass information about your current git repository
@env to pass your shell environment

> 
❯ wk
❯ cd ../_____CONTAINERS
❯ ls
 @imgnx                           'Red Herring'
 __apple_mac_os_x_flipclock_app   References
 __templates__                    search
 _heaven                          secret_floor
 Art                              security
 Artificial_Intelligence          sheet-music-reader
 awesome                          sound
 awesome-sbom                     stripe-gradient
 awesome-seml                     template_library
 bhamjobs-com                     Themes
 bntyhntrs                        tmp
 bulma                            Trash
 chalkbox                         utils.nosync-x
 cron                             vision
 crossnote                        vscode-codicons
 cryptopal                        vscode-extension-samples
 Electron.js                      www-imgfunnels-com
 firebot                          X
 gittaku                          -I@
 hackrz-x                         '2512 Wildwood Crossings 6.m4a'
 handsay                          @
 imgnx-icon-theme                 _heaven.zip
 imgnx-one                        bkup.bat
 imgnxtensions                    bkup.sh
 interactive_tree_app             chat
 language                         company_name.plain
 live                             git-list.sh
 localtunnel-server               heaven.zip
 locl-x                           Icon\r
 lvl-1                            localtunnel
 lvl-2                            ls
 lvl-3                            README.md
 node-serialport                  todo.rtf
 pa11y                            Win_10_Pro_Activation
 reality                          wizzy-tools.zip
 realtime                         xargs
❯ cd Electron.js/
❯ git add .
❯ git commit -m "Generating boilerplate"
[main 94478f8] Generating boilerplate
 24 files changed, 1145 insertions(+), 19019 deletions(-)
 create mode 100644 #README.md#
 create mode 100644 .crossnote/config.js
 create mode 100644 .crossnote/head.html
 create mode 100644 .crossnote/parser.js
 create mode 100644 .crossnote/style.less
 delete mode 100755 .pnp.cjs
 delete mode 100644 .pnp.loader.mjs
 create mode 100644 .yarnrc.yml
 create mode 100644 README.d
 delete mode 100644 app.js
 delete mode 100644 index.html
 delete mode 100644 main.js
 create mode 100644 packages/main/main.js
 create mode 100644 packages/main/package.json
 rename preload.js => packages/main/preload.js (100%)
 create mode 100644 packages/renderer/package.json
 create mode 100644 packages/renderer/public/index.html
 rename src/renderer/app.jsx => packages/renderer/src/App.jsx (100%)
 rename {src/renderer => packages/renderer/src}/index.jsx (74%)
 create mode 100644 tsconfig.json
 create mode 100755 yarn.reset.sh
❯ 
❯ q chat

Hi, I'm Amazon Q. I can answer questions about your shell and CLI tools!
You can include additional context by adding the following to your prompt:

@history to pass your shell history
@git to pass information about your current git repository
@env to pass your shell environment

> @git What do I put in the /src/main/package.json file?
Using git context

I'll help you create a basic package.json file for your Electron.js project. 
Here's a typical structure with commonly needed fields:

json
{
  "name": "your-electron-app-name",
  "version": "1.0.0",
  "description": "Your Electron application description",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "electron-builder"
  },
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "electron": "^latest_version",
    "electron-builder": "^latest_version"
  },
  "dependencies": {
  },
  "build": {
    "appId": "com.your.app",
    "mac": {
      "category": "your.app.category"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}


Key points about this configuration:

1. main: Points to your main entry file (typically main.js)
2. scripts: Defines common commands like npm start to run your app
3. devDependencies: Include Electron and build tools
4. dependencies: Add any other packages your app needs
5. build: Configuration for electron-builder if you plan to package your app

To use this:

1. Replace "your-electron-app-name" with your actual app name
2. Update the description
3. Modify the author field
4. Update the build configuration as needed
5. Add any additional dependencies your project requires

After creating this file, you can install dependencies by running:

bash
npm install


This will create your node_modules folder and install the necessary 
dependencies.

> Can you check my codebase and tell me if I'm missing anything? @git
Using git context

I notice from the git status that you have modifications in 
packages/main/package.json, but I can't see the actual contents of your 
codebase. To properly review your code and identify what might be missing, I 
would need to see:

1. The contents of your package.json file
2. Your project structure
3. Key files like main.js, preload scripts, etc.

You can share these by using commands like:

bash
# Show project structure
ls -R

# Show package.json contents
cat packages/main/package.json

# Show main entry file
cat packages/main/main.js  # or wherever your main file is located


Once you provide this information, I can:
• Review your dependencies
• Check for missing essential Electron components
• Verify your build configuration
• Suggest security best practices
• Identify any missing scripts or configurations

Would you like to share any of these details so I can provide a more specific 
review

> 
❯ # Show project structure
ls -R

# Show package.json contents
cat packages/main/package.json

# Show main entry file
cat packages/main/main.js  # or wherever your main file is located


 node_modules        package.json   styles.css              yarn.lock
 packages            README.d       tsconfig.json           yarn.reset.sh
 #README.md#         README.md     󰜫 webpack.config.js      
 package-lock.json   renderer.js    webpack.dev.config.js  

./node_modules:
./node_modules/is-network-error: Too many open files (os error 24)
./node_modules/is-number: Too many open files (os error 24)
./node_modules/is-plain-obj: Too many open files (os error 24)
./node_modules/is-plain-object: Too many open files (os error 24)
./node_modules/is-unicode-supported: Too many open files (os error 24)
./node_modules/is-wsl: Too many open files (os error 24)
./node_modules/isarray: Too many open files (os error 24)
./node_modules/isbinaryfile: Too many open files (os error 24)
./node_modules/isexe: Too many open files (os error 24)
./node_modules/isobject: Too many open files (os error 24)
./node_modules/jackspeak: Too many open files (os error 24)
./node_modules/jake: Too many open files (os error 24)
./node_modules/jest-worker: Too many open files (os error 24)
./node_modules/joi: Too many open files (os error 24)
./node_modules/js-tokens: Too many open files (os error 24)
./node_modules/js-yaml: Too many open files (os error 24)
./node_modules/jsbn: Too many open files (os error 24)
./node_modules/jsesc: Too many open files (os error 24)
./node_modules/json-buffer: Too many open files (os error 24)
./node_modules/json-parse-even-better-errors: Too many open files (os error 24)
./node_modules/json-schema-traverse: Too many open files (os error 24)
./node_modules/json-stringify-safe: Too many open files (os error 24)
./node_modules/json5: Too many open files (os error 24)
./node_modules/jsonfile: Too many open files (os error 24)
./node_modules/keyv: Too many open files (os error 24)
./node_modules/kind-of: Too many open files (os error 24)
./node_modules/launch-editor: Too many open files (os error 24)
./node_modules/lazy-val: Too many open files (os error 24)
./node_modules/loader-runner: Too many open files (os error 24)
./node_modules/locate-path: Too many open files (os error 24)
./node_modules/lodash: Too many open files (os error 24)
./node_modules/lodash.debounce: Too many open files (os error 24)
./node_modules/log-symbols: Too many open files (os error 24)
./node_modules/lowercase-keys: Too many open files (os error 24)
./node_modules/lru-cache: Too many open files (os error 24)
./node_modules/make-fetch-happen: Too many open files (os error 24)
./node_modules/matcher: Too many open files (os error 24)
./node_modules/math-intrinsics: Too many open files (os error 24)
./node_modules/media-typer: Too many open files (os error 24)
./node_modules/memfs: Too many open files (os error 24)
./node_modules/merge-descriptors: Too many open files (os error 24)
./node_modules/merge-stream: Too many open files (os error 24)
./node_modules/methods: Too many open files (os error 24)
./node_modules/micromatch: Too many open files (os error 24)
./node_modules/mime: Too many open files (os error 24)
./node_modules/mime-db: Too many open files (os error 24)
./node_modules/mime-types: Too many open files (os error 24)
./node_modules/mimic-fn: Too many open files (os error 24)
./node_modules/mimic-response: Too many open files (os error 24)
./node_modules/minimalistic-assert: Too many open files (os error 24)
./node_modules/minimatch: Too many open files (os error 24)
./node_modules/minimist: Too many open files (os error 24)
./node_modules/minipass: Too many open files (os error 24)
./node_modules/minipass-collect: Too many open files (os error 24)
./node_modules/minipass-fetch: Too many open files (os error 24)
./node_modules/minipass-flush: Too many open files (os error 24)
./node_modules/minipass-pipeline: Too many open files (os error 24)
./node_modules/minipass-sized: Too many open files (os error 24)
./node_modules/minizlib: Too many open files (os error 24)
./node_modules/mkdirp: Too many open files (os error 24)
./node_modules/ms: Too many open files (os error 24)
./node_modules/multicast-dns: Too many open files (os error 24)
./node_modules/negotiator: Too many open files (os error 24)
./node_modules/neo-async: Too many open files (os error 24)
./node_modules/node-abi: Too many open files (os error 24)
./node_modules/node-addon-api: Too many open files (os error 24)
./node_modules/node-api-version: Too many open files (os error 24)
./node_modules/node-forge: Too many open files (os error 24)
./node_modules/node-gyp: Too many open files (os error 24)
./node_modules/node-releases: Too many open files (os error 24)
./node_modules/nopt: Too many open files (os error 24)
./node_modules/normalize-path: Too many open files (os error 24)
./node_modules/normalize-url: Too many open files (os error 24)
./node_modules/npmlog: Too many open files (os error 24)
./node_modules/object-inspect: Too many open files (os error 24)
./node_modules/object-keys: Too many open files (os error 24)
./node_modules/obuf: Too many open files (os error 24)
./node_modules/on-finished: Too many open files (os error 24)
./node_modules/on-headers: Too many open files (os error 24)
./node_modules/once: Too many open files (os error 24)
./node_modules/onetime: Too many open files (os error 24)
./node_modules/open: Too many open files (os error 24)
./node_modules/ora: Too many open files (os error 24)
./node_modules/p-cancelable: Too many open files (os error 24)
./node_modules/p-limit: Too many open files (os error 24)
./node_modules/p-locate: Too many open files (os error 24)
./node_modules/p-map: Too many open files (os error 24)
./node_modules/p-retry: Too many open files (os error 24)
./node_modules/p-try: Too many open files (os error 24)
./node_modules/package-json-from-dist: Too many open files (os error 24)
./node_modules/parseurl: Too many open files (os error 24)
./node_modules/path-exists: Too many open files (os error 24)
./node_modules/path-is-absolute: Too many open files (os error 24)
./node_modules/path-key: Too many open files (os error 24)
./node_modules/path-parse: Too many open files (os error 24)
./node_modules/path-scurry: Too many open files (os error 24)
./node_modules/path-to-regexp: Too many open files (os error 24)
./node_modules/pe-library: Too many open files (os error 24)
./node_modules/pend: Too many open files (os error 24)
./node_modules/picocolors: Too many open files (os error 24)
./node_modules/picomatch: Too many open files (os error 24)
./node_modules/pkg-dir: Too many open files (os error 24)
./node_modules/plist: Too many open files (os error 24)
./node_modules/proc-log: Too many open files (os error 24)
./node_modules/process-nextick-args: Too many open files (os error 24)
./node_modules/progress: Too many open files (os error 24)
./node_modules/promise-inflight: Too many open files (os error 24)
./node_modules/promise-retry: Too many open files (os error 24)
./node_modules/proxy-addr: Too many open files (os error 24)
./node_modules/proxy-from-env: Too many open files (os error 24)
./node_modules/pump: Too many open files (os error 24)
./node_modules/punycode: Too many open files (os error 24)
./node_modules/qs: Too many open files (os error 24)
./node_modules/quick-lru: Too many open files (os error 24)
./node_modules/randombytes: Too many open files (os error 24)
./node_modules/range-parser: Too many open files (os error 24)
./node_modules/raw-body: Too many open files (os error 24)
./node_modules/react: Too many open files (os error 24)
./node_modules/react-dom: Too many open files (os error 24)
./node_modules/read-binary-file-arch: Too many open files (os error 24)
./node_modules/readable-stream: Too many open files (os error 24)
./node_modules/readdirp: Too many open files (os error 24)
./node_modules/rechoir: Too many open files (os error 24)
./node_modules/regenerate: Too many open files (os error 24)
./node_modules/regenerate-unicode-properties: Too many open files (os error 24)
./node_modules/regenerator-runtime: Too many open files (os error 24)
./node_modules/regenerator-transform: Too many open files (os error 24)
./node_modules/regexpu-core: Too many open files (os error 24)
./node_modules/regjsgen: Too many open files (os error 24)
./node_modules/regjsparser: Too many open files (os error 24)
./node_modules/require-directory: Too many open files (os error 24)
./node_modules/require-from-string: Too many open files (os error 24)
./node_modules/requires-port: Too many open files (os error 24)
./node_modules/resedit: Too many open files (os error 24)
./node_modules/resolve: Too many open files (os error 24)
./node_modules/resolve-alpn: Too many open files (os error 24)
./node_modules/resolve-cwd: Too many open files (os error 24)
./node_modules/resolve-from: Too many open files (os error 24)
./node_modules/responselike: Too many open files (os error 24)
./node_modules/restore-cursor: Too many open files (os error 24)
./node_modules/retry: Too many open files (os error 24)
./node_modules/rimraf: Too many open files (os error 24)
./node_modules/roarr: Too many open files (os error 24)
./node_modules/run-applescript: Too many open files (os error 24)
./node_modules/rxjs: Too many open files (os error 24)
./node_modules/safe-buffer: Too many open files (os error 24)
./node_modules/safer-buffer: Too many open files (os error 24)
./node_modules/sanitize-filename: Too many open files (os error 24)
./node_modules/sax: Too many open files (os error 24)
./node_modules/scheduler: Too many open files (os error 24)
./node_modules/schema-utils: Too many open files (os error 24)
./node_modules/select-hose: Too many open files (os error 24)
./node_modules/selfsigned: Too many open files (os error 24)
./node_modules/semver: Too many open files (os error 24)
./node_modules/semver-compare: Too many open files (os error 24)
./node_modules/send: Too many open files (os error 24)
./node_modules/serialize-error: Too many open files (os error 24)
./node_modules/serialize-javascript: Too many open files (os error 24)
./node_modules/serve-index: Too many open files (os error 24)
./node_modules/serve-static: Too many open files (os error 24)
./node_modules/set-blocking: Too many open files (os error 24)
./node_modules/setprototypeof: Too many open files (os error 24)
./node_modules/shallow-clone: Too many open files (os error 24)
./node_modules/shebang-command: Too many open files (os error 24)
./node_modules/shebang-regex: Too many open files (os error 24)
./node_modules/shell-quote: Too many open files (os error 24)
./node_modules/side-channel: Too many open files (os error 24)
./node_modules/side-channel-list: Too many open files (os error 24)
./node_modules/side-channel-map: Too many open files (os error 24)
./node_modules/side-channel-weakmap: Too many open files (os error 24)
./node_modules/signal-exit: Too many open files (os error 24)
./node_modules/simple-update-notifier: Too many open files (os error 24)
./node_modules/slice-ansi: Too many open files (os error 24)
./node_modules/smart-buffer: Too many open files (os error 24)
./node_modules/sockjs: Too many open files (os error 24)
./node_modules/socks: Too many open files (os error 24)
./node_modules/socks-proxy-agent: Too many open files (os error 24)
./node_modules/source-map: Too many open files (os error 24)
./node_modules/source-map-support: Too many open files (os error 24)
./node_modules/spdy: Too many open files (os error 24)
./node_modules/spdy-transport: Too many open files (os error 24)
./node_modules/sprintf-js: Too many open files (os error 24)
./node_modules/ssri: Too many open files (os error 24)
./node_modules/stat-mode: Too many open files (os error 24)
./node_modules/statuses: Too many open files (os error 24)
./node_modules/string-width: Too many open files (os error 24)
./node_modules/string-width-cjs: Too many open files (os error 24)
./node_modules/string_decoder: Too many open files (os error 24)
./node_modules/strip-ansi: Too many open files (os error 24)
./node_modules/strip-ansi-cjs: Too many open files (os error 24)
./node_modules/sumchecker: Too many open files (os error 24)
./node_modules/supports-color: Too many open files (os error 24)
./node_modules/supports-preserve-symlinks-flag: Too many open files (os error 24)
./node_modules/tapable: Too many open files (os error 24)
./node_modules/tar: Too many open files (os error 24)
./node_modules/temp-file: Too many open files (os error 24)
./node_modules/terser: Too many open files (os error 24)
./node_modules/terser-webpack-plugin: Too many open files (os error 24)
./node_modules/thingies: Too many open files (os error 24)
./node_modules/thunky: Too many open files (os error 24)
./node_modules/tmp: Too many open files (os error 24)
./node_modules/tmp-promise: Too many open files (os error 24)
./node_modules/to-regex-range: Too many open files (os error 24)
./node_modules/toidentifier: Too many open files (os error 24)
./node_modules/tree-dump: Too many open files (os error 24)
./node_modules/tree-kill: Too many open files (os error 24)
./node_modules/truncate-utf8-bytes: Too many open files (os error 24)
./node_modules/tslib: Too many open files (os error 24)
./node_modules/type-fest: Too many open files (os error 24)
./node_modules/type-is: Too many open files (os error 24)
./node_modules/typescript: Too many open files (os error 24)
./node_modules/undici-types: Too many open files (os error 24)
./node_modules/unicode-canonical-property-names-ecmascript: Too many open files (os error 24)
./node_modules/unicode-match-property-ecmascript: Too many open files (os error 24)
./node_modules/unicode-match-property-value-ecmascript: Too many open files (os error 24)
./node_modules/unicode-property-aliases-ecmascript: Too many open files (os error 24)
./node_modules/unique-filename: Too many open files (os error 24)
./node_modules/unique-slug: Too many open files (os error 24)
./node_modules/universalify: Too many open files (os error 24)
./node_modules/unpipe: Too many open files (os error 24)
./node_modules/update-browserslist-db: Too many open files (os error 24)
./node_modules/uri-js: Too many open files (os error 24)
./node_modules/utf8-byte-length: Too many open files (os error 24)
./node_modules/util-deprecate: Too many open files (os error 24)
./node_modules/utils-merge: Too many open files (os error 24)
./node_modules/uuid: Too many open files (os error 24)
./node_modules/vary: Too many open files (os error 24)
./node_modules/verror: Too many open files (os error 24)
./node_modules/wait-on: Too many open files (os error 24)
./node_modules/watchpack: Too many open files (os error 24)
./node_modules/wbuf: Too many open files (os error 24)
./node_modules/wcwidth: Too many open files (os error 24)
./node_modules/webpack: Too many open files (os error 24)
./node_modules/webpack-cli: Too many open files (os error 24)
./node_modules/webpack-dev-middleware: Too many open files (os error 24)
./node_modules/webpack-dev-server: Too many open files (os error 24)
./node_modules/webpack-merge: Too many open files (os error 24)
./node_modules/webpack-sources: Too many open files (os error 24)
./node_modules/websocket-driver: Too many open files (os error 24)
./node_modules/websocket-extensions: Too many open files (os error 24)
./node_modules/which: Too many open files (os error 24)
./node_modules/wide-align: Too many open files (os error 24)
./node_modules/wildcard: Too many open files (os error 24)
./node_modules/wrap-ansi: Too many open files (os error 24)
./node_modules/wrap-ansi-cjs: Too many open files (os error 24)
./node_modules/wrappy: Too many open files (os error 24)
./node_modules/ws: Too many open files (os error 24)
./node_modules/xmlbuilder: Too many open files (os error 24)
./node_modules/y18n: Too many open files (os error 24)
./node_modules/yallist: Too many open files (os error 24)
./node_modules/yargs: Too many open files (os error 24)
./node_modules/yargs-parser: Too many open files (os error 24)
./node_modules/yauzl: Too many open files (os error 24)
./node_modules/yocto-queue: Too many open files (os error 24)
 7zip-bin                                      unique-filename
 @ampproject                                   unique-slug
 @babel                                        universalify
 @develar                                      unpipe
 @discoveryjs                                  update-browserslist-db
 @electron                                     uri-js
 @gar                                          utf8-byte-length
 @hapi                                         util-deprecate
 @isaacs                                       utils-merge
 @jridgewell                                   uuid
 @jsonjoy.com                                  vary
 @leichtgewicht                                verror
 @malept                                       wait-on
 @npmcli                                       watchpack
 @pkgjs                                        wbuf
 @sideway                                      wcwidth
 @sindresorhus                                 webpack
 @szmarczak                                    webpack-cli
 @tootallnate                                  webpack-dev-middleware
 @types                                        webpack-dev-server
 @webassemblyjs                                webpack-merge
 @webpack-cli                                  webpack-sources
 @xmldom                                       websocket-driver
 @xtuc                                         websocket-extensions
 abbrev                                        which
 accepts                                       wide-align
 acorn                                         wildcard
 agent-base                                    wrap-ansi
 agentkeepalive                                wrap-ansi-cjs
 aggregate-error                               wrappy
 ajv                                           ws
 ajv-keywords                                  xmlbuilder
 ansi-html-community                           y18n
 ansi-regex                                    yallist
 ansi-styles                                   yargs
 anymatch                                      yargs-parser
 app-builder-bin                               yauzl
 app-builder-lib                               yocto-queue
 aproba                                       
 are-we-there-yet                             
 argparse                                     
 array-flatten                                
 assert-plus                                  
 astral-regex                                 
 async                                        
 async-exit-hook                              
 asynckit                                     
 at-least-node                                
 axios                                        
 babel-loader                                 
 babel-plugin-polyfill-corejs2                
 babel-plugin-polyfill-corejs3                
 babel-plugin-polyfill-regenerator            
 balanced-match                               
 base64-js                                    
 batch                                        
 binary-extensions                            
 bl                                           
 bluebird                                     
 bluebird-lst                                 
 body-parser                                  
 bonjour-service                              
 boolean                                      
 brace-expansion                              
 braces                                       
 browserslist                                 
 buffer                                       
 buffer-crc32                                 
 buffer-from                                  
 builder-util                                 
 builder-util-runtime                         
 bundle-name                                  
 bytes                                        
 cacache                                      
 cacheable-lookup                             
 cacheable-request                            
 call-bind-apply-helpers                      
 call-bound                                   
 caniuse-lite                                 
 chalk                                        
 chokidar                                     
 chownr                                       
 chrome-trace-event                           
 chromium-pickle-js                           
 ci-info                                      
 clean-stack                                  
 cli-cursor                                   
 cli-spinners                                 
 cli-truncate                                 
 cliui                                        
 clone                                        
 clone-deep                                   
 clone-response                               
 color-convert                                
 color-name                                   
 color-support                                
 colorette                                    
 combined-stream                              
 commander                                    
 common-path-prefix                           
 compare-version                              
 compressible                                 
 compression                                  
 concat-map                                   
 concurrently                                 
 config-file-ts                               
 connect-history-api-fallback                 
 console-control-strings                      
 content-disposition                          
 content-type                                 
 convert-source-map                           
 cookie                                       
 cookie-signature                             
 core-js-compat                               
 core-util-is                                 
 crc                                          
 cross-spawn                                  
 debug                                        
 decompress-response                          
 default-browser                              
 default-browser-id                           
 defaults                                     
 defer-to-connect                             
 define-data-property                         
 define-lazy-prop                             
 define-properties                            
 delayed-stream                               
 delegates                                    
 depd                                         
 destroy                                      
 detect-libc                                  
 detect-node                                  
 dir-compare                                  
 dmg-builder                                  
 dmg-license                                  
 dns-packet                                   
 dotenv                                       
 dotenv-expand                                
 dunder-proto                                 
 eastasianwidth                               
 ee-first                                     
 ejs                                          
 electron                                     
 electron-builder                             
 electron-publish                             
 electron-to-chromium                         
 emoji-regex                                  
 encodeurl                                    
 encoding                                     
 end-of-stream                                
 enhanced-resolve                             
 env-paths                                    
 envinfo                                      
 err-code                                     
 es-define-property                           
 es-errors                                    
 es-module-lexer                              
 es-object-atoms                              
 es6-error                                    
 escalade                                     
 escape-html                                  
 escape-string-regexp                         
 eslint-scope                                 
 esrecurse                                    
 estraverse                                   
 esutils                                      
 etag                                         
 eventemitter3                                
 events                                       
 exponential-backoff                          
 express                                      
 extract-zip                                  
 extsprintf                                   
 fast-deep-equal                              
 fast-json-stable-stringify                   
 fast-uri                                     
 fastest-levenshtein                          
 faye-websocket                               
 fd-slicer                                    
 filelist                                     
 fill-range                                   
 finalhandler                                 
 find-cache-dir                               
 find-up                                      
 flat                                         
 follow-redirects                             
 foreground-child                             
 form-data                                    
 forwarded                                    
 fresh                                        
 fs-extra                                     
 fs-minipass                                  
 fs.realpath                                  
 fsevents                                     
 function-bind                                
 gauge                                        
 gensync                                      
 get-caller-file                              
 get-intrinsic                                
 get-stream                                   
 glob                                         
 glob-parent                                  
 glob-to-regexp                               
 global-agent                                 
 globals                                      
 globalthis                                   
 gopd                                         
 got                                          
 graceful-fs                                  
 handle-thing                                 
 has-flag                                     
 has-property-descriptors                     
 has-symbols                                  
 has-unicode                                  
 hasown                                       
 hosted-git-info                              
 hpack.js                                     
 http-cache-semantics                         
 http-deceiver                                
 http-errors                                  
 http-parser-js                               
 http-proxy                                   
 http-proxy-agent                             
 http-proxy-middleware                        
 http2-wrapper                                
 https-proxy-agent                            
 humanize-ms                                  
 hyperdyperid                                 
 iconv-corefoundation                         
 iconv-lite                                   
 ieee754                                      
 import-local                                 
 imurmurhash                                  
 indent-string                                
 infer-owner                                  
 inflight                                     
 inherits                                     
 interpret                                    
 ip-address                                   
 ipaddr.js                                    
 is-binary-path                               
 is-ci                                        
 is-core-module                               
 is-docker                                    
 is-extglob                                   
 is-fullwidth-code-point                      
 is-glob                                      
 is-inside-container                          
 is-interactive                               
 is-lambda                                    
 is-network-error                             
 is-number                                    
 is-plain-obj                                 
 is-plain-object                              
 is-unicode-supported                         
 is-wsl                                       
 isarray                                      
 isbinaryfile                                 
 isexe                                        
 isobject                                     
 jackspeak                                    
 jake                                         
 jest-worker                                  
 joi                                          
 js-tokens                                    
 js-yaml                                      
 jsbn                                         
 jsesc                                        
 json-buffer                                  
 json-parse-even-better-errors                
 json-schema-traverse                         
 json-stringify-safe                          
 json5                                        
 jsonfile                                     
 keyv                                         
 kind-of                                      
 launch-editor                                
 lazy-val                                     
 loader-runner                                
 locate-path                                  
 lodash                                       
 lodash.debounce                              
 log-symbols                                  
 lowercase-keys                               
 lru-cache                                    
 make-fetch-happen                            
 matcher                                      
 math-intrinsics                              
 media-typer                                  
 memfs                                        
 merge-descriptors                            
 merge-stream                                 
 methods                                      
 micromatch                                   
 mime                                         
 mime-db                                      
 mime-types                                   
 mimic-fn                                     
 mimic-response                               
 minimalistic-assert                          
 minimatch                                    
 minimist                                     
 minipass                                     
 minipass-collect                             
 minipass-fetch                               
 minipass-flush                               
 minipass-pipeline                            
 minipass-sized                               
 minizlib                                     
 mkdirp                                       
 ms                                           
 multicast-dns                                
 negotiator                                   
 neo-async                                    
 node-abi                                     
 node-addon-api                               
 node-api-version                             
 node-forge                                   
 node-gyp                                     
 node-releases                                
 nopt                                         
 normalize-path                               
 normalize-url                                
 npmlog                                       
 object-inspect                               
 object-keys                                  
 obuf                                         
 on-finished                                  
 on-headers                                   
 once                                         
 onetime                                      
 open                                         
 ora                                          
 p-cancelable                                 
 p-limit                                      
 p-locate                                     
 p-map                                        
 p-retry                                      
 p-try                                        
 package-json-from-dist                       
 parseurl                                     
 path-exists                                  
 path-is-absolute                             
 path-key                                     
 path-parse                                   
 path-scurry                                  
 path-to-regexp                               
 pe-library                                   
 pend                                         
 picocolors                                   
 picomatch                                    
 pkg-dir                                      
 plist                                        
 proc-log                                     
 process-nextick-args                         
 progress                                     
 promise-inflight                             
 promise-retry                                
 proxy-addr                                   
 proxy-from-env                               
 pump                                         
 punycode                                     
 qs                                           
 quick-lru                                    
 randombytes                                  
 range-parser                                 
 raw-body                                     
 react                                        
 react-dom                                    
 read-binary-file-arch                        
 readable-stream                              
 readdirp                                     
 rechoir                                      
 regenerate                                   
 regenerate-unicode-properties                
 regenerator-runtime                          
 regenerator-transform                        
 regexpu-core                                 
 regjsgen                                     
 regjsparser                                  
 require-directory                            
 require-from-string                          
 requires-port                                
 resedit                                      
 resolve                                      
 resolve-alpn                                 
 resolve-cwd                                  
 resolve-from                                 
 responselike                                 
 restore-cursor                               
 retry                                        
 rimraf                                       
 roarr                                        
 run-applescript                              
 rxjs                                         
 safe-buffer                                  
 safer-buffer                                 
 sanitize-filename                            
 sax                                          
 scheduler                                    
 schema-utils                                 
 select-hose                                  
 selfsigned                                   
 semver                                       
 semver-compare                               
 send                                         
 serialize-error                              
 serialize-javascript                         
 serve-index                                  
 serve-static                                 
 set-blocking                                 
 setprototypeof                               
 shallow-clone                                
 shebang-command                              
 shebang-regex                                
 shell-quote                                  
 side-channel                                 
 side-channel-list                            
 side-channel-map                             
 side-channel-weakmap                         
 signal-exit                                  
 simple-update-notifier                       
 slice-ansi                                   
 smart-buffer                                 
 sockjs                                       
 socks                                        
 socks-proxy-agent                            
 source-map                                   
 source-map-support                           
 spdy                                         
 spdy-transport                               
 sprintf-js                                   
 ssri                                         
 stat-mode                                    
 statuses                                     
 string-width                                 
 string-width-cjs                             
 string_decoder                               
 strip-ansi                                   
 strip-ansi-cjs                               
 sumchecker                                   
 supports-color                               
 supports-preserve-symlinks-flag              
 tapable                                      
 tar                                          
 temp-file                                    
 terser                                       
 terser-webpack-plugin                        
 thingies                                     
 thunky                                       
 tmp                                          
 tmp-promise                                  
 to-regex-range                               
 toidentifier                                 
 tree-dump                                    
 tree-kill                                    
 truncate-utf8-bytes                          
 tslib                                        
 type-fest                                    
 type-is                                      
 typescript                                   
 undici-types                                 
 unicode-canonical-property-names-ecmascript  
 unicode-match-property-ecmascript            
 unicode-match-property-value-ecmascript      
 unicode-property-aliases-ecmascript          

./node_modules/7zip-bin:
./node_modules/7zip-bin/linux: Too many open files (os error 24)
./node_modules/7zip-bin/mac: Too many open files (os error 24)
./node_modules/7zip-bin/win: Too many open files (os error 24)
 linux   win     index.d.ts   LICENSE.txt    README.md
 mac     7x.sh   index.js     package.json  

./node_modules/@ampproject:
 remapping

./node_modules/@ampproject/remapping:
./node_modules/@ampproject/remapping/dist: Too many open files (os error 24)
 dist   LICENSE   package.json   README.md

./node_modules/@babel:
./node_modules/@babel/core: Too many open files (os error 24)
./node_modules/@babel/generator: Too many open files (os error 24)
./node_modules/@babel/helper-annotate-as-pure: Too many open files (os error 24)
./node_modules/@babel/helper-compilation-targets: Too many open files (os error 24)
./node_modules/@babel/helper-create-class-features-plugin: Too many open files (os error 24)
./node_modules/@babel/helper-create-regexp-features-plugin: Too many open files (os error 24)
./node_modules/@babel/helper-define-polyfill-provider: Too many open files (os error 24)
./node_modules/@babel/helper-member-expression-to-functions: Too many open files (os error 24)
./node_modules/@babel/helper-module-imports: Too many open files (os error 24)
./node_modules/@babel/helper-module-transforms: Too many open files (os error 24)
./node_modules/@babel/helper-optimise-call-expression: Too many open files (os error 24)
./node_modules/@babel/helper-plugin-utils: Too many open files (os error 24)
./node_modules/@babel/helper-remap-async-to-generator: Too many open files (os error 24)
./node_modules/@babel/helper-replace-supers: Too many open files (os error 24)
./node_modules/@babel/helper-skip-transparent-expression-wrappers: Too many open files (os error 24)
./node_modules/@babel/helper-string-parser: Too many open files (os error 24)
./node_modules/@babel/helper-validator-identifier: Too many open files (os error 24)
./node_modules/@babel/helper-validator-option: Too many open files (os error 24)
./node_modules/@babel/helper-wrap-function: Too many open files (os error 24)
./node_modules/@babel/helpers: Too many open files (os error 24)
./node_modules/@babel/parser: Too many open files (os error 24)
./node_modules/@babel/plugin-bugfix-firefox-class-in-computed-class-key: Too many open files (os error 24)
./node_modules/@babel/plugin-bugfix-safari-class-field-initializer-scope: Too many open files (os error 24)
./node_modules/@babel/plugin-bugfix-safari-id-destructuring-collision-in-function-expression: Too many open files (os error 24)
./node_modules/@babel/plugin-bugfix-v8-spread-parameters-in-optional-chaining: Too many open files (os error 24)
./node_modules/@babel/plugin-bugfix-v8-static-class-fields-redefine-readonly: Too many open files (os error 24)
./node_modules/@babel/plugin-proposal-private-property-in-object: Too many open files (os error 24)
./node_modules/@babel/plugin-syntax-import-assertions: Too many open files (os error 24)
./node_modules/@babel/plugin-syntax-import-attributes: Too many open files (os error 24)
./node_modules/@babel/plugin-syntax-jsx: Too many open files (os error 24)
./node_modules/@babel/plugin-syntax-unicode-sets-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-arrow-functions: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-async-generator-functions: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-async-to-generator: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-block-scoped-functions: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-block-scoping: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-class-properties: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-class-static-block: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-classes: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-computed-properties: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-destructuring: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-dotall-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-duplicate-keys: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-duplicate-named-capturing-groups-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-dynamic-import: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-exponentiation-operator: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-export-namespace-from: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-for-of: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-function-name: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-json-strings: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-literals: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-logical-assignment-operators: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-member-expression-literals: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-modules-amd: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-modules-commonjs: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-modules-systemjs: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-modules-umd: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-named-capturing-groups-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-new-target: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-nullish-coalescing-operator: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-numeric-separator: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-object-rest-spread: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-object-super: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-optional-catch-binding: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-optional-chaining: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-parameters: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-private-methods: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-private-property-in-object: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-property-literals: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-react-display-name: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-react-jsx: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-react-jsx-development: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-react-pure-annotations: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-regenerator: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-regexp-modifiers: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-reserved-words: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-shorthand-properties: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-spread: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-sticky-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-template-literals: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-typeof-symbol: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-unicode-escapes: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-unicode-property-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-unicode-regex: Too many open files (os error 24)
./node_modules/@babel/plugin-transform-unicode-sets-regex: Too many open files (os error 24)
./node_modules/@babel/preset-env: Too many open files (os error 24)
./node_modules/@babel/preset-modules: Too many open files (os error 24)
./node_modules/@babel/preset-react: Too many open files (os error 24)
./node_modules/@babel/runtime: Too many open files (os error 24)
./node_modules/@babel/template: Too many open files (os error 24)
./node_modules/@babel/traverse: Too many open files (os error 24)
./node_modules/@babel/types: Too many open files (os error 24)
 code-frame
 compat-data
 core
 generator
 helper-annotate-as-pure
 helper-compilation-targets
 helper-create-class-features-plugin
 helper-create-regexp-features-plugin
 helper-define-polyfill-provider
 helper-member-expression-to-functions
 helper-module-imports
 helper-module-transforms
 helper-optimise-call-expression
 helper-plugin-utils
 helper-remap-async-to-generator
 helper-replace-supers
 helper-skip-transparent-expression-wrappers
 helper-string-parser
 helper-validator-identifier
 helper-validator-option
 helper-wrap-function
 helpers
 parser
 plugin-bugfix-firefox-class-in-computed-class-key
 plugin-bugfix-safari-class-field-initializer-scope
 plugin-bugfix-safari-id-destructuring-collision-in-function-expression
 plugin-bugfix-v8-spread-parameters-in-optional-chaining
 plugin-bugfix-v8-static-class-fields-redefine-readonly
 plugin-proposal-private-property-in-object
 plugin-syntax-import-assertions
 plugin-syntax-import-attributes
 plugin-syntax-jsx
 plugin-syntax-unicode-sets-regex
 plugin-transform-arrow-functions
 plugin-transform-async-generator-functions
 plugin-transform-async-to-generator
 plugin-transform-block-scoped-functions
 plugin-transform-block-scoping
 plugin-transform-class-properties
 plugin-transform-class-static-block
 plugin-transform-classes
 plugin-transform-computed-properties
 plugin-transform-destructuring
 plugin-transform-dotall-regex
 plugin-transform-duplicate-keys
 plugin-transform-duplicate-named-capturing-groups-regex
 plugin-transform-dynamic-import
 plugin-transform-exponentiation-operator
 plugin-transform-export-namespace-from
 plugin-transform-for-of
 plugin-transform-function-name
 plugin-transform-json-strings
 plugin-transform-literals
 plugin-transform-logical-assignment-operators
 plugin-transform-member-expression-literals
 plugin-transform-modules-amd
 plugin-transform-modules-commonjs
 plugin-transform-modules-systemjs
 plugin-transform-modules-umd
 plugin-transform-named-capturing-groups-regex
 plugin-transform-new-target
 plugin-transform-nullish-coalescing-operator
 plugin-transform-numeric-separator
 plugin-transform-object-rest-spread
 plugin-transform-object-super
 plugin-transform-optional-catch-binding
 plugin-transform-optional-chaining
 plugin-transform-parameters
 plugin-transform-private-methods
 plugin-transform-private-property-in-object
 plugin-transform-property-literals
 plugin-transform-react-display-name
 plugin-transform-react-jsx
 plugin-transform-react-jsx-development
 plugin-transform-react-pure-annotations
 plugin-transform-regenerator
 plugin-transform-regexp-modifiers
 plugin-transform-reserved-words
 plugin-transform-shorthand-properties
 plugin-transform-spread
 plugin-transform-sticky-regex
 plugin-transform-template-literals
 plugin-transform-typeof-symbol
 plugin-transform-unicode-escapes
 plugin-transform-unicode-property-regex
 plugin-transform-unicode-regex
 plugin-transform-unicode-sets-regex
 preset-env
 preset-modules
 preset-react
 runtime
 template
 traverse
 types

./node_modules/@babel/code-frame:
./node_modules/@babel/code-frame/lib: Too many open files (os error 24)
 lib   LICENSE   package.json   README.md

./node_modules/@babel/compat-data:
 data                           native-modules.js        plugins.js
 corejs2-built-ins.js           overlapping-plugins.js   README.md
 corejs3-shipped-proposals.js   package.json            
 LICENSE                        plugin-bugfixes.js      

./node_modules/@babel/compat-data/data:
 corejs2-built-ins.json           overlapping-plugins.json
 corejs3-shipped-proposals.json   plugin-bugfixes.json
 native-modules.json              plugins.json

./node_modules/@develar:
 schema-utils

./node_modules/@develar/schema-utils:
 declarations   dist   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/@develar/schema-utils/declarations:
./node_modules/@develar/schema-utils/declarations/keywords: Too many open files (os error 24)
./node_modules/@develar/schema-utils/declarations/util: Too many open files (os error 24)
 keywords   util   index.d.ts   validate.d.ts   ValidationError.d.ts

./node_modules/@develar/schema-utils/dist:
./node_modules/@develar/schema-utils/dist/util: Too many open files (os error 24)
 keywords   util   index.js   validate.js   ValidationError.js

./node_modules/@develar/schema-utils/dist/keywords:
 absolutePath.js

./node_modules/@discoveryjs:
 json-ext

./node_modules/@discoveryjs/json-ext:
 cjs   dist   src   index.d.ts   LICENSE   package.json   README.md

./node_modules/@discoveryjs/json-ext/cjs:
 index.cjs           stringify-chunked.cjs   utils.cjs
 parse-chunked.cjs   stringify-info.cjs      web-streams.cjs

./node_modules/@discoveryjs/json-ext/dist:
 json-ext.js   json-ext.min.js   json-ext.min.js.map   package.json

./node_modules/@discoveryjs/json-ext/src:
 index.js           stringify-chunked.js   utils.js
 parse-chunked.js   stringify-info.js      web-streams.js

./node_modules/@electron:
./node_modules/@electron/universal: Too many open files (os error 24)
 asar   get   notarize   osx-sign   rebuild   universal

./node_modules/@electron/asar:
./node_modules/@electron/asar/bin: Too many open files (os error 24)
./node_modules/@electron/asar/lib: Too many open files (os error 24)
./node_modules/@electron/asar/node_modules: Too many open files (os error 24)
 bin   lib   node_modules   LICENSE.md   package.json   README.md

./node_modules/@electron/get:
./node_modules/@electron/get/node_modules: Too many open files (os error 24)
 dist   node_modules   LICENSE   package.json   README.md

./node_modules/@electron/get/dist:
./node_modules/@electron/get/dist/cjs: Too many open files (os error 24)
./node_modules/@electron/get/dist/esm: Too many open files (os error 24)
 cjs   esm

./node_modules/@electron/notarize:
 lib   node_modules   LICENSE   package.json   README.md

./node_modules/@electron/notarize/lib:
 check-signature.d.ts     legacy.d.ts         staple.d.ts
 check-signature.js       legacy.js           staple.js
 check-signature.js.map   legacy.js.map       staple.js.map
 helpers.d.ts             notarytool.d.ts     types.d.ts
 helpers.js               notarytool.js       types.js
 helpers.js.map           notarytool.js.map   types.js.map
 index.d.ts               spawn.d.ts          validate-args.d.ts
 index.js                 spawn.js            validate-args.js
 index.js.map             spawn.js.map        validate-args.js.map

./node_modules/@electron/notarize/node_modules:
 fs-extra

./node_modules/@electron/notarize/node_modules/fs-extra:
./node_modules/@electron/notarize/node_modules/fs-extra/lib: Too many open files (os error 24)
 lib   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/@electron/osx-sign:
 bin   dist   entitlements   LICENSE   package.json   README.md

./node_modules/@electron/osx-sign/bin:
 electron-osx-flat-usage.txt   electron-osx-sign-usage.txt
 electron-osx-flat.js          electron-osx-sign.js

./node_modules/@electron/osx-sign/dist:
./node_modules/@electron/osx-sign/dist/esm: Too many open files (os error 24)
 cjs   esm

./node_modules/@electron/osx-sign/dist/cjs:
 flat.d.ts      types.js.map                        util.js
 flat.js        util-entitlements.d.ts              util.js.map
 flat.js.map    util-entitlements.js               
 index.d.ts     util-entitlements.js.map           
 index.js       util-identities.d.ts               
 index.js.map   util-identities.js                 
 sign.d.ts      util-identities.js.map             
 sign.js        util-provisioning-profiles.d.ts    
 sign.js.map    util-provisioning-profiles.js      
 types.d.ts     util-provisioning-profiles.js.map  
 types.js       util.d.ts                          

./node_modules/@electron/osx-sign/entitlements:
 default.darwin.gpu.plist      default.darwin.renderer.plist
 default.darwin.plist          default.mas.child.plist
 default.darwin.plugin.plist   default.mas.plist

./node_modules/@electron/rebuild:
 lib   node_modules   LICENSE   package.json   README.md

./node_modules/@electron/rebuild/lib:
 module-type             electron-locator.js.map   prebuild-shim.js.map
 arch.d.ts               fetcher.d.ts              read-package-json.d.ts
 arch.js                 fetcher.js                read-package-json.js
 arch.js.map             fetcher.js.map            read-package-json.js.map
 cache.d.ts              main.d.ts                 rebuild.d.ts
 cache.js                main.js                   rebuild.js
 cache.js.map            main.js.map               rebuild.js.map
 clang-fetcher.d.ts      module-rebuilder.d.ts     search-module.d.ts
 clang-fetcher.js        module-rebuilder.js       search-module.js
 clang-fetcher.js.map    module-rebuilder.js.map   search-module.js.map
 cli.d.ts                module-walker.d.ts        sysroot-fetcher.d.ts
 cli.js                  module-walker.js          sysroot-fetcher.js
 cli.js.map              module-walker.js.map      sysroot-fetcher.js.map
 constants.d.ts          node-api.d.ts             types.d.ts
 constants.js            node-api.js               types.js
 constants.js.map        node-api.js.map           types.js.map
 electron-locator.d.ts   prebuild-shim.d.ts       
 electron-locator.js     prebuild-shim.js         

./node_modules/@electron/rebuild/lib/module-type:
 node-gyp            node-pre-gyp.js           prebuildify.d.ts
 index.d.ts          node-pre-gyp.js.map       prebuildify.js
 index.js            prebuild-install.d.ts     prebuildify.js.map
 index.js.map        prebuild-install.js      
 node-pre-gyp.d.ts   prebuild-install.js.map  

./node_modules/@electron/rebuild/lib/module-type/node-gyp:
 node-gyp.d.ts   node-gyp.js.map   worker.js
 node-gyp.js     worker.d.ts       worker.js.map

./node_modules/@electron/rebuild/node_modules:
./node_modules/@electron/rebuild/node_modules/cacache: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/glob: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/http-proxy-agent: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/https-proxy-agent: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/lru-cache: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/make-fetch-happen: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/minipass: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/minipass-fetch: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/minizlib: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/node-gyp: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/nopt: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/p-map: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/socks-proxy-agent: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/ssri: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/unique-filename: Too many open files (os error 24)
./node_modules/@electron/rebuild/node_modules/unique-slug: Too many open files (os error 24)
 @npmcli      http-proxy-agent    minipass-fetch   socks-proxy-agent
 abbrev       https-proxy-agent   minizlib         ssri
 agent-base   lru-cache           node-gyp         unique-filename
 cacache      make-fetch-happen   nopt             unique-slug
 glob         minipass            p-map           

./node_modules/@electron/rebuild/node_modules/@npmcli:
./node_modules/@electron/rebuild/node_modules/@npmcli/fs: Too many open files (os error 24)
 fs

./node_modules/@electron/rebuild/node_modules/abbrev:
 abbrev.js   LICENSE   package.json   README.md

./node_modules/@electron/rebuild/node_modules/agent-base:
 dist   src   package.json   README.md

./node_modules/@electron/rebuild/node_modules/agent-base/dist:
./node_modules/@electron/rebuild/node_modules/agent-base/dist/src: Too many open files (os error 24)
 src

./node_modules/@electron/rebuild/node_modules/agent-base/src:
 index.ts   promisify.ts

./node_modules/@gar:
 promisify

./node_modules/@gar/promisify:
 index.js   LICENSE.md   package.json   README.md

./node_modules/@hapi:
 hoek   topo

./node_modules/@hapi/hoek:
 lib   LICENSE.md   package.json   README.md

./node_modules/@hapi/hoek/lib:
 applyToDefaults.js   escapeHeaderAttribute.js   intersect.js       utils.js
 assert.js            escapeHtml.js              isPromise.js       wait.js
 bench.js             escapeJson.js              merge.js          
 block.js             escapeRegex.js             once.js           
 clone.js             flatten.js                 reach.js          
 contain.js           ignore.js                  reachTemplate.js  
 deepEqual.js         index.d.ts                 stringify.js      
 error.js             index.js                   types.js          

./node_modules/@hapi/topo:
 lib   LICENSE.md   package.json   README.md

./node_modules/@hapi/topo/lib:
 index.d.ts   index.js

./node_modules/@isaacs:
 cliui   fs-minipass

./node_modules/@isaacs/cliui:
 build   node_modules   index.mjs   LICENSE.txt   package.json   README.md

./node_modules/@isaacs/cliui/build:
 lib   index.cjs   index.d.cts

./node_modules/@isaacs/cliui/build/lib:
 index.js

./node_modules/@isaacs/cliui/node_modules:
./node_modules/@isaacs/cliui/node_modules/wrap-ansi: Too many open files (os error 24)
 ansi-regex    emoji-regex    strip-ansi
 ansi-styles   string-width   wrap-ansi

./node_modules/@isaacs/cliui/node_modules/ansi-regex:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/@isaacs/cliui/node_modules/ansi-styles:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/@isaacs/cliui/node_modules/emoji-regex:
 es2015       index.js          package.json   RGI_Emoji.d.ts   text.d.ts
 index.d.ts   LICENSE-MIT.txt   README.md      RGI_Emoji.js     text.js

./node_modules/@isaacs/cliui/node_modules/emoji-regex/es2015:
 index.d.ts   RGI_Emoji.d.ts   text.d.ts
 index.js     RGI_Emoji.js     text.js

./node_modules/@isaacs/cliui/node_modules/string-width:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/@isaacs/cliui/node_modules/strip-ansi:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/@isaacs/fs-minipass:
 dist   LICENSE   package.json   README.md

./node_modules/@isaacs/fs-minipass/dist:
 commonjs   esm

./node_modules/@isaacs/fs-minipass/dist/commonjs:
 index.d.ts   index.d.ts.map   index.js   index.js.map   package.json

./node_modules/@isaacs/fs-minipass/dist/esm:
 index.d.ts   index.d.ts.map   index.js   index.js.map   package.json

./node_modules/@jridgewell:
 gen-mapping   set-array    sourcemap-codec
 resolve-uri   source-map   trace-mapping

./node_modules/@jridgewell/gen-mapping:
 dist   LICENSE   package.json   README.md

./node_modules/@jridgewell/gen-mapping/dist:
 types             gen-mapping.mjs.map   gen-mapping.umd.js.map
 gen-mapping.mjs   gen-mapping.umd.js   

./node_modules/@jridgewell/gen-mapping/dist/types:
 gen-mapping.d.ts   sourcemap-segment.d.ts   types.d.ts

./node_modules/@jridgewell/resolve-uri:
 dist   LICENSE   package.json   README.md

./node_modules/@jridgewell/resolve-uri/dist:
 types             resolve-uri.mjs.map   resolve-uri.umd.js.map
 resolve-uri.mjs   resolve-uri.umd.js   

./node_modules/@jridgewell/resolve-uri/dist/types:
 resolve-uri.d.ts

./node_modules/@jridgewell/set-array:
 dist   LICENSE   package.json   README.md

./node_modules/@jridgewell/set-array/dist:
 types           set-array.mjs.map   set-array.umd.js.map
 set-array.mjs   set-array.umd.js   

./node_modules/@jridgewell/set-array/dist/types:
 set-array.d.ts

./node_modules/@jridgewell/source-map:
 dist   LICENSE   package.json   README.md

./node_modules/@jridgewell/source-map/dist:
 types                source-map.mjs       source-map.umd.js.map
 source-map.cjs       source-map.mjs.map  
 source-map.cjs.map   source-map.umd.js   

./node_modules/@jridgewell/source-map/dist/types:
 source-map.d.ts

./node_modules/@jridgewell/sourcemap-codec:
 dist   LICENSE   package.json   README.md

./node_modules/@jridgewell/sourcemap-codec/dist:
 types                 sourcemap-codec.mjs.map   sourcemap-codec.umd.js.map
 sourcemap-codec.mjs   sourcemap-codec.umd.js   

./node_modules/@jridgewell/sourcemap-codec/dist/types:
 scopes.d.ts   sourcemap-codec.d.ts   strings.d.ts   vlq.d.ts

./node_modules/@jridgewell/trace-mapping:
 dist   LICENSE   package.json   README.md

./node_modules/@jridgewell/trace-mapping/dist:
 types               trace-mapping.mjs.map   trace-mapping.umd.js.map
 trace-mapping.mjs   trace-mapping.umd.js   

./node_modules/@jridgewell/trace-mapping/dist/types:
 any-map.d.ts         resolve.d.ts             strip-filename.d.ts
 binary-search.d.ts   sort.d.ts                trace-mapping.d.ts
 by-source.d.ts       sourcemap-segment.d.ts   types.d.ts

./node_modules/@jsonjoy.com:
 base64   json-pack   util

./node_modules/@jsonjoy.com/base64:
 lib   LICENSE   package.json   README.md

./node_modules/@jsonjoy.com/base64/lib:
 util                            fromBase64.d.ts        toBase64Url.js
 constants.d.ts                  fromBase64.js          toBase64Url.js.map
 constants.js                    fromBase64.js.map     
 constants.js.map                fromBase64Bin.d.ts    
 createFromBase64.d.ts           fromBase64Bin.js      
 createFromBase64.js             fromBase64Bin.js.map  
 createFromBase64.js.map         fromBase64Url.d.ts    
 createFromBase64Bin.d.ts        fromBase64Url.js      
 createFromBase64Bin.js          fromBase64Url.js.map  
 createFromBase64Bin.js.map      index.d.ts            
 createToBase64.d.ts             index.js              
 createToBase64.js               index.js.map          
 createToBase64.js.map           toBase64.d.ts         
 createToBase64Bin.d.ts          toBase64.js           
 createToBase64Bin.js            toBase64.js.map       
 createToBase64Bin.js.map        toBase64Bin.d.ts      
 createToBase64BinUint8.d.ts     toBase64Bin.js        
 createToBase64BinUint8.js       toBase64Bin.js.map    
 createToBase64BinUint8.js.map   toBase64Url.d.ts      

./node_modules/@jsonjoy.com/base64/lib/util:
 buffers   strings

./node_modules/@jsonjoy.com/base64/lib/util/buffers:
 b.d.ts     bufferToUint8Array.d.ts     copy.d.ts
 b.js       bufferToUint8Array.js       copy.js
 b.js.map   bufferToUint8Array.js.map   copy.js.map

./node_modules/@jsonjoy.com/base64/lib/util/strings:
 flatstr.d.ts   flatstr.js   flatstr.js.map

./node_modules/@jsonjoy.com/json-pack:
 lib   LICENSE   package.json   README.md

./node_modules/@jsonjoy.com/json-pack/lib:
./node_modules/@jsonjoy.com/json-pack/lib/json-pointer: Too many open files (os error 24)
./node_modules/@jsonjoy.com/json-pack/lib/msgpack: Too many open files (os error 24)
./node_modules/@jsonjoy.com/json-pack/lib/resp: Too many open files (os error 24)
./node_modules/@jsonjoy.com/json-pack/lib/ubjson: Too many open files (os error 24)
./node_modules/@jsonjoy.com/json-pack/lib/util: Too many open files (os error 24)
 bencode        msgpack            index.js                   types.d.ts
 bson           resp               index.js.map               types.js
 cbor           ubjson             JsonPackExtension.d.ts     types.js.map
 codecs         util               JsonPackExtension.js      
 ion            constants.d.ts     JsonPackExtension.js.map  
 json           constants.js       JsonPackValue.d.ts        
 json-binary    constants.js.map   JsonPackValue.js          
 json-pointer   index.d.ts         JsonPackValue.js.map      

./node_modules/@jsonjoy.com/json-pack/lib/bencode:
 BencodeDecoder.d.ts     BencodeEncoder.d.ts     index.d.ts     types.d.ts
 BencodeDecoder.js       BencodeEncoder.js       index.js       types.js
 BencodeDecoder.js.map   BencodeEncoder.js.map   index.js.map   types.js.map

./node_modules/@jsonjoy.com/json-pack/lib/bson:
 BsonEncoder.d.ts     index.d.ts     values.d.ts
 BsonEncoder.js       index.js       values.js
 BsonEncoder.js.map   index.js.map   values.js.map

./node_modules/@jsonjoy.com/json-pack/lib/cbor:
 CborDecoder.d.ts         CborEncoder.js.map         constants.js
 CborDecoder.js           CborEncoderDag.d.ts        constants.js.map
 CborDecoder.js.map       CborEncoderDag.js          index.d.ts
 CborDecoderBase.d.ts     CborEncoderDag.js.map      index.js
 CborDecoderBase.js       CborEncoderFast.d.ts       index.js.map
 CborDecoderBase.js.map   CborEncoderFast.js         shared.d.ts
 CborDecoderDag.d.ts      CborEncoderFast.js.map     shared.js
 CborDecoderDag.js        CborEncoderStable.d.ts     shared.js.map
 CborDecoderDag.js.map    CborEncoderStable.js       types.d.ts
 CborEncoder.d.ts         CborEncoderStable.js.map   types.js
 CborEncoder.js           constants.d.ts             types.js.map

./node_modules/@jsonjoy.com/json-pack/lib/codecs:
 cbor.d.ts     Codecs.d.ts     json.d.ts     msgpack.d.ts     types.d.ts
 cbor.js       Codecs.js       json.js       msgpack.js       types.js
 cbor.js.map   Codecs.js.map   json.js.map   msgpack.js.map   types.js.map

./node_modules/@jsonjoy.com/json-pack/lib/ion:
 ast.d.ts           Import.d.ts     IonEncoderFast.d.ts     types.d.ts
 ast.js             Import.js       IonEncoderFast.js       types.js
 ast.js.map         Import.js.map   IonEncoderFast.js.map   types.js.map
 constants.d.ts     index.d.ts      symbols.d.ts           
 constants.js       index.js        symbols.js             
 constants.js.map   index.js.map    symbols.js.map         

./node_modules/@jsonjoy.com/json-pack/lib/json:
 index.d.ts            JsonDecoderDag.js.map    JsonEncoderStable.js
 index.js              JsonEncoder.d.ts         JsonEncoderStable.js.map
 index.js.map          JsonEncoder.js           types.d.ts
 JsonDecoder.d.ts      JsonEncoder.js.map       types.js
 JsonDecoder.js        JsonEncoderDag.d.ts      types.js.map
 JsonDecoder.js.map    JsonEncoderDag.js        util.d.ts
 JsonDecoderDag.d.ts   JsonEncoderDag.js.map    util.js
 JsonDecoderDag.js     JsonEncoderStable.d.ts   util.js.map

./node_modules/@jsonjoy.com/json-pack/lib/json-binary:
 codec.d.ts     constants.d.ts     index.d.ts     types.d.ts
 codec.js       constants.js       index.js       types.js
 codec.js.map   constants.js.map   index.js.map   types.js.map

./node_modules/@jsonjoy.com/util:
 lib   LICENSE   package.json   README.md

./node_modules/@jsonjoy.com/util/lib:
./node_modules/@jsonjoy.com/util/lib/json-size: Too many open files (os error 24)
./node_modules/@jsonjoy.com/util/lib/print: Too many open files (os error 24)
./node_modules/@jsonjoy.com/util/lib/sort: Too many open files (os error 24)
./node_modules/@jsonjoy.com/util/lib/streams: Too many open files (os error 24)
./node_modules/@jsonjoy.com/util/lib/strings: Too many open files (os error 24)
 buffers        strings                 isEmpty.js.map        types.js.map
 codegen        Fuzzer.d.ts             lazyFunction.d.ts    
 compression    Fuzzer.js               lazyFunction.js      
 json-brand     Fuzzer.js.map           lazyFunction.js.map  
 json-clone     hasOwnProperty.d.ts     NullObject.d.ts      
 json-equal     hasOwnProperty.js       NullObject.js        
 json-pointer   hasOwnProperty.js.map   NullObject.js.map    
 json-random    index.d.ts              objKeyCmp.d.ts       
 json-size      index.js                objKeyCmp.js         
 print          index.js.map            objKeyCmp.js.map     
 sort           isEmpty.d.ts            types.d.ts           
 streams        isEmpty.js              types.js             

./node_modules/@jsonjoy.com/util/lib/buffers:
./node_modules/@jsonjoy.com/util/lib/buffers/utf8: Too many open files (os error 24)
 utf8                        isUint8Array.d.ts             Writer.js
 b.d.ts                      isUint8Array.js               Writer.js.map
 b.js                        isUint8Array.js.map          
 b.js.map                    printOctets.d.ts             
 bufferToUint8Array.d.ts     printOctets.js               
 bufferToUint8Array.js       printOctets.js.map           
 bufferToUint8Array.js.map   Reader.d.ts                  
 cmpUint8Array.d.ts          Reader.js                    
 cmpUint8Array.js            Reader.js.map                
 cmpUint8Array.js.map        Slice.d.ts                   
 cmpUint8Array2.d.ts         Slice.js                     
 cmpUint8Array2.js           Slice.js.map                 
 cmpUint8Array2.js.map       StreamingOctetReader.d.ts    
 cmpUint8Array3.d.ts         StreamingOctetReader.js      
 cmpUint8Array3.js           StreamingOctetReader.js.map  
 cmpUint8Array3.js.map       StreamingReader.d.ts         
 concat.d.ts                 StreamingReader.js           
 concat.js                   StreamingReader.js.map       
 concat.js.map               strings.d.ts                 
 copy.d.ts                   strings.js                   
 copy.js                     strings.js.map               
 copy.js.map                 toBuf.d.ts                   
 f16.d.ts                    toBuf.js                     
 f16.js                      toBuf.js.map                 
 f16.js.map                  toUint8Array.d.ts            
 index.d.ts                  toUint8Array.js              
 index.js                    toUint8Array.js.map          
 index.js.map                types.d.ts                   
 isArrayBuffer.d.ts          types.js                     
 isArrayBuffer.js            types.js.map                 
 isArrayBuffer.js.map        Uint8ArrayCut.d.ts           
 isFloat32.d.ts              Uint8ArrayCut.js             
 isFloat32.js                Uint8ArrayCut.js.map         
 isFloat32.js.map            Writer.d.ts                  

./node_modules/@jsonjoy.com/util/lib/codegen:
 util             compile.js               index.d.ts     switch.js.map
 Codegen.d.ts     compile.js.map           index.js       types.d.ts
 Codegen.js       dynamicFunction.d.ts     index.js.map   types.js
 Codegen.js.map   dynamicFunction.js       switch.d.ts    types.js.map
 compile.d.ts     dynamicFunction.js.map   switch.js     

./node_modules/@jsonjoy.com/util/lib/codegen/util:
 helpers.d.ts     JsExpression.d.ts     normalizeAccessor.d.ts
 helpers.js       JsExpression.js       normalizeAccessor.js
 helpers.js.map   JsExpression.js.map   normalizeAccessor.js.map

./node_modules/@jsonjoy.com/util/lib/compression:
 gzip.d.ts   gzip.js   gzip.js.map

./node_modules/@jsonjoy.com/util/lib/json-brand:
 index.d.ts   index.js.map   types.js
 index.js     types.d.ts     types.js.map

./node_modules/@jsonjoy.com/util/lib/json-clone:
 clone.d.ts     cloneBinary.d.ts     index.d.ts
 clone.js       cloneBinary.js       index.js
 clone.js.map   cloneBinary.js.map   index.js.map

./node_modules/@jsonjoy.com/util/lib/json-equal:
 $$deepEqual   deepEqual

./node_modules/@jsonjoy.com/util/lib/json-equal/$$deepEqual:
 index.d.ts   index.js   index.js.map   v1.d.ts   v1.js   v1.js.map

./node_modules/@jsonjoy.com/util/lib/json-equal/deepEqual:
 index.d.ts     v1.d.ts     v2.d.ts     v3.d.ts     v4.d.ts     v5.d.ts
 index.js       v1.js       v2.js       v3.js       v4.js       v5.js
 index.js.map   v1.js.map   v2.js.map   v3.js.map   v4.js.map   v5.js.map

./node_modules/@jsonjoy.com/util/lib/json-pointer:
 index.d.ts   index.js.map   types.js
 index.js     types.d.ts     types.js.map

./node_modules/@jsonjoy.com/util/lib/json-random:
 index.d.ts   index.js.map      RandomJson.js
 index.js     RandomJson.d.ts   RandomJson.js.map

./node_modules/@leichtgewicht:
 ip-codec

./node_modules/@leichtgewicht/ip-codec:
 types   index.cjs   index.mjs   LICENSE   package.json   Readme.md

./node_modules/@leichtgewicht/ip-codec/types:
 index.d.ts

./node_modules/@malept:
 cross-spawn-promise   flatpak-bundler

./node_modules/@malept/cross-spawn-promise:
 dist   LICENSE   package.json   README.md

./node_modules/@malept/cross-spawn-promise/dist:
 src

./node_modules/@malept/cross-spawn-promise/dist/src:
 index.d.ts   index.js   index.js.map

./node_modules/@malept/flatpak-bundler:
 node_modules   index.js   LICENSE   package.json   README.md

./node_modules/@malept/flatpak-bundler/node_modules:
 fs-extra

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra:
 lib   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib:
./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/move-sync: Too many open files (os error 24)
./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/output: Too many open files (os error 24)
./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/path-exists: Too many open files (os error 24)
./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/remove: Too many open files (os error 24)
./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/util: Too many open files (os error 24)
 copy        empty    fs     mkdirs   move-sync   path-exists   util
 copy-sync   ensure   json   move     output      remove        index.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/copy:
 copy.js   index.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/copy-sync:
 copy-sync.js   index.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/empty:
 index.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/ensure:
 file.js    link.js            symlink-type.js
 index.js   symlink-paths.js   symlink.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/fs:
 index.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/json:
 index.js   jsonfile.js   output-json-sync.js   output-json.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/mkdirs:
 index.js   make-dir.js

./node_modules/@malept/flatpak-bundler/node_modules/fs-extra/lib/move:
 index.js   move.js

./node_modules/@npmcli:
 agent   fs   move-file

./node_modules/@npmcli/agent:
 lib   package.json   README.md

./node_modules/@npmcli/agent/lib:
 agents.js   dns.js   errors.js   index.js   options.js   proxy.js

./node_modules/@npmcli/fs:
 lib   LICENSE.md   package.json   README.md

./node_modules/@npmcli/fs/lib:
 common   index.js       readdir-scoped.js
 cp       move-file.js   with-temp-dir.js

./node_modules/@npmcli/fs/lib/common:
 get-options.js   node.js

./node_modules/@npmcli/fs/lib/cp:
 errors.js   index.js   LICENSE   polyfill.js

./node_modules/@npmcli/move-file:
 lib   LICENSE.md   package.json   README.md

./node_modules/@npmcli/move-file/lib:
 index.js

./node_modules/@pkgjs:
 parseargs

./node_modules/@pkgjs/parseargs:
 examples   CHANGELOG.md   LICENSE        README.md
 internal   index.js       package.json   utils.js

./node_modules/@pkgjs/parseargs/examples:
 is-default-value.js    negate.js                ordered-options.mjs
 limit-long-syntax.js   no-repeated-options.js   simple-hard-coded.js

./node_modules/@pkgjs/parseargs/internal:
 errors.js   primordials.js   util.js   validators.js

./node_modules/@sideway:
 address   formula   pinpoint

./node_modules/@sideway/address:
 lib   LICENSE.md   package.json   README.md

./node_modules/@sideway/address/lib:
 decode.js   email.js    index.d.ts   ip.js     uri.js
 domain.js   errors.js   index.js     tlds.js  

./node_modules/@sideway/formula:
 lib   LICENSE.md   package.json   README.md

./node_modules/@sideway/formula/lib:
 index.d.ts   index.js

./node_modules/@sideway/pinpoint:
 lib   LICENSE.md   package.json   README.md

./node_modules/@sideway/pinpoint/lib:
 index.d.ts   index.js

./node_modules/@sindresorhus:
 is

./node_modules/@sindresorhus/is:
 dist   license   package.json   readme.md

./node_modules/@sindresorhus/is/dist:
 index.d.ts   index.js   types.d.ts   types.js

./node_modules/@szmarczak:
 http-timer

./node_modules/@szmarczak/http-timer:
 dist   LICENSE   package.json   README.md

./node_modules/@szmarczak/http-timer/dist:
 source

./node_modules/@szmarczak/http-timer/dist/source:
 index.d.ts   index.js

./node_modules/@tootallnate:
 once

./node_modules/@tootallnate/once:
 dist   LICENSE   package.json   README.md

./node_modules/@tootallnate/once/dist:
 index.d.ts     overloaded-parameters.d.ts     types.d.ts
 index.js       overloaded-parameters.js       types.js
 index.js.map   overloaded-parameters.js.map   types.js.map

./node_modules/@types:
./node_modules/@types/node: Too many open files (os error 24)
./node_modules/@types/node-forge: Too many open files (os error 24)
./node_modules/@types/plist: Too many open files (os error 24)
./node_modules/@types/qs: Too many open files (os error 24)
./node_modules/@types/range-parser: Too many open files (os error 24)
./node_modules/@types/responselike: Too many open files (os error 24)
./node_modules/@types/retry: Too many open files (os error 24)
./node_modules/@types/send: Too many open files (os error 24)
./node_modules/@types/serve-index: Too many open files (os error 24)
./node_modules/@types/serve-static: Too many open files (os error 24)
./node_modules/@types/sockjs: Too many open files (os error 24)
./node_modules/@types/verror: Too many open files (os error 24)
./node_modules/@types/ws: Too many open files (os error 24)
./node_modules/@types/yauzl: Too many open files (os error 24)
 body-parser                    fs-extra               qs
 bonjour                        http-cache-semantics   range-parser
 cacheable-request              http-errors            responselike
 connect                        http-proxy             retry
 connect-history-api-fallback   json-schema            send
 debug                          keyv                   serve-index
 eslint                         mime                   serve-static
 eslint-scope                   ms                     sockjs
 estree                         node                   verror
 express                        node-forge             ws
 express-serve-static-core      plist                  yauzl

./node_modules/@types/body-parser:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/bonjour:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/cacheable-request:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/connect:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/connect-history-api-fallback:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/debug:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/eslint:
 rules        LICENSE        README.md
 index.d.ts   package.json   use-at-your-own-risk.d.ts

./node_modules/@types/eslint/rules:
 best-practices.d.ts   index.d.ts             strict-mode.d.ts
 deprecated.d.ts       node-commonjs.d.ts     stylistic-issues.d.ts
 ecmascript-6.d.ts     possible-errors.d.ts   variables.d.ts

./node_modules/@types/eslint-scope:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/estree:
 flow.d.ts   index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/express:
 node_modules   index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/express/node_modules:
 @types

./node_modules/@types/express/node_modules/@types:
 express-serve-static-core

./node_modules/@types/express/node_modules/@types/express-serve-static-core:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/express-serve-static-core:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/fs-extra:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/http-cache-semantics:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/http-errors:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/http-proxy:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/json-schema:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/keyv:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@types/mime:
 index.d.ts   LICENSE   lite.d.ts   Mime.d.ts   package.json   README.md

./node_modules/@types/ms:
 index.d.ts   LICENSE   package.json   README.md

./node_modules/@webassemblyjs:
 ast                         helper-numbers         leb128      wasm-opt
 floating-point-hex-parser   helper-wasm-bytecode   utf8        wasm-parser
 helper-api-error            helper-wasm-section    wasm-edit   wast-printer
 helper-buffer               ieee754                wasm-gen   

./node_modules/@webassemblyjs/ast:
 esm   lib   scripts   LICENSE   package.json   README.md

./node_modules/@webassemblyjs/ast/esm:
 transform   definitions.js    node-path.js    traverse.js
 types       index.js          nodes.js        utils.js
 clone.js    node-helpers.js   signatures.js  

./node_modules/@webassemblyjs/ast/esm/transform:
./node_modules/@webassemblyjs/ast/esm/transform/ast-module-to-module-context: Too many open files (os error 24)
./node_modules/@webassemblyjs/ast/esm/transform/denormalize-type-references: Too many open files (os error 24)
./node_modules/@webassemblyjs/ast/esm/transform/wast-identifier-to-index: Too many open files (os error 24)
 ast-module-to-module-context   wast-identifier-to-index
 denormalize-type-references   

./node_modules/@webassemblyjs/ast/esm/types:
 basic.js   nodes.js   traverse.js

./node_modules/@webassemblyjs/ast/lib:
 transform   definitions.js    node-path.js    traverse.js
 types       index.js          nodes.js        utils.js
 clone.js    node-helpers.js   signatures.js  

./node_modules/@webassemblyjs/ast/lib/transform:
./node_modules/@webassemblyjs/ast/lib/transform/denormalize-type-references: Too many open files (os error 24)
./node_modules/@webassemblyjs/ast/lib/transform/wast-identifier-to-index: Too many open files (os error 24)
 ast-module-to-module-context   wast-identifier-to-index
 denormalize-type-references   

./node_modules/@webassemblyjs/ast/lib/transform/ast-module-to-module-context:
 index.js

./node_modules/@webassemblyjs/ast/lib/types:
 basic.js   nodes.js   traverse.js

./node_modules/@webassemblyjs/ast/scripts:
 generateNodeUtils.js   generateTypeDefinitions.js   util.js

./node_modules/@webassemblyjs/floating-point-hex-parser:
 esm   lib   LICENSE   package.json   README.md

./node_modules/@webassemblyjs/floating-point-hex-parser/esm:
 index.js

./node_modules/@webassemblyjs/floating-point-hex-parser/lib:
 index.js

./node_modules/@webassemblyjs/helper-api-error:
 esm   lib   LICENSE   package.json

./node_modules/@webassemblyjs/helper-api-error/esm:
 index.js

./node_modules/@webassemblyjs/helper-api-error/lib:
 index.js

./node_modules/@webassemblyjs/helper-buffer:
 esm   lib   LICENSE   package.json

./node_modules/@webassemblyjs/helper-buffer/esm:
 compare.js   index.js

./node_modules/@webassemblyjs/helper-buffer/lib:
 compare.js   index.js

./node_modules/@webassemblyjs/helper-numbers:
 esm   lib   src   LICENSE   package.json

./node_modules/@webassemblyjs/helper-numbers/esm:
 index.js

./node_modules/@webassemblyjs/helper-numbers/lib:
 index.js

./node_modules/@webassemblyjs/helper-numbers/src:
 index.js

./node_modules/@webassemblyjs/helper-wasm-bytecode:
 esm   lib   LICENSE   package.json

./node_modules/@webassemblyjs/helper-wasm-bytecode/esm:
 index.js   section.js

./node_modules/@webassemblyjs/helper-wasm-bytecode/lib:
 index.js   section.js

./node_modules/@webassemblyjs/helper-wasm-section:
 esm   lib   LICENSE   package.json

./node_modules/@webassemblyjs/helper-wasm-section/esm:
 create.js   index.js   remove.js   resize.js

./node_modules/@webassemblyjs/helper-wasm-section/lib:
 create.js   index.js   remove.js   resize.js

./node_modules/@webassemblyjs/ieee754:
 esm   lib   src   LICENSE   package.json

./node_modules/@webassemblyjs/ieee754/esm:
 index.js

./node_modules/@webassemblyjs/ieee754/lib:
 index.js

./node_modules/@webassemblyjs/ieee754/src:
 index.js

./node_modules/@webassemblyjs/leb128:
 esm   lib   LICENSE.txt   package.json

./node_modules/@webassemblyjs/leb128/esm:
 bits.js   bufs.js   index.js   leb.js

./node_modules/@webassemblyjs/leb128/lib:
 bits.js   bufs.js   index.js   leb.js

./node_modules/@webassemblyjs/utf8:
 esm   lib   src   test   LICENSE   package.json

./node_modules/@webassemblyjs/utf8/esm:
 decoder.js   encoder.js   index.js

./node_modules/@webassemblyjs/utf8/lib:
 decoder.js   encoder.js   index.js

./node_modules/@webassemblyjs/utf8/src:
 decoder.js   encoder.js   index.js

./node_modules/@webassemblyjs/utf8/test:
 index.js

./node_modules/@webassemblyjs/wasm-edit:
 esm   lib   LICENSE   package.json   README.md

./node_modules/@webassemblyjs/wasm-edit/esm:
 apply.js   index.js

./node_modules/@webassemblyjs/wasm-edit/lib:
 apply.js   index.js

./node_modules/@webassemblyjs/wasm-gen:
 esm   lib   LICENSE   package.json

./node_modules/@webassemblyjs/wasm-gen/esm:
 encoder   index.js

./node_modules/@webassemblyjs/wasm-gen/esm/encoder:
 index.js

./node_modules/@webassemblyjs/wasm-gen/lib:
 encoder   index.js

./node_modules/@webassemblyjs/wasm-gen/lib/encoder:
 index.js

./node_modules/@webassemblyjs/wasm-opt:
 esm   lib   LICENSE   package.json

./node_modules/@webassemblyjs/wasm-opt/esm:
 index.js   leb128.js

./node_modules/@webassemblyjs/wasm-opt/lib:
 index.js   leb128.js

./node_modules/@webassemblyjs/wasm-parser:
 esm   lib   LICENSE   package.json   README.md

./node_modules/@webassemblyjs/wasm-parser/esm:
 types   decoder.js   index.js

./node_modules/@webassemblyjs/wasm-parser/esm/types:
 decoder.js

./node_modules/@webassemblyjs/wasm-parser/lib:
 types   decoder.js   index.js

./node_modules/@webassemblyjs/wasm-parser/lib/types:
 decoder.js

./node_modules/@webassemblyjs/wast-printer:
 esm   lib   LICENSE   package.json   README.md

./node_modules/@webassemblyjs/wast-printer/esm:
 index.js

./node_modules/@webassemblyjs/wast-printer/lib:
 index.js

./node_modules/@webpack-cli:
 configtest   info   serve

./node_modules/@webpack-cli/configtest:
 lib   LICENSE   package.json   README.md

./node_modules/@webpack-cli/configtest/lib:
 index.d.ts   index.js

./node_modules/@webpack-cli/info:
 lib   LICENSE   package.json   README.md

./node_modules/@webpack-cli/info/lib:
 index.d.ts   index.js

./node_modules/@webpack-cli/serve:
 lib   LICENSE   package.json   README.md

./node_modules/@webpack-cli/serve/lib:
 index.d.ts   index.js

./node_modules/@xmldom:
 xmldom

./node_modules/@xmldom/xmldom:
 lib            index.d.ts   package.json   SECURITY.md
 CHANGELOG.md   LICENSE      readme.md     

./node_modules/@xmldom/xmldom/lib:
 conventions.js   dom-parser.js   dom.js   entities.js   index.js   sax.js

./node_modules/@xtuc:
 ieee754   long

./node_modules/@xtuc/ieee754:
 dist   index.js   LICENSE   package.json   README.md

./node_modules/@xtuc/ieee754/dist:
 index.cjs.js

./node_modules/@xtuc/long:
 dist   src   index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/@xtuc/long/dist:
 long.js   long.js.map

./node_modules/@xtuc/long/src:
 long.js

./node_modules/abbrev:
 lib   LICENSE   package.json   README.md

./node_modules/abbrev/lib:
 index.js

./node_modules/accepts:
 node_modules   HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/accepts/node_modules:
 negotiator

./node_modules/accepts/node_modules/negotiator:
 lib   HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/accepts/node_modules/negotiator/lib:
 charset.js   encoding.js   language.js   mediaType.js

./node_modules/acorn:
 bin   dist   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/acorn/bin:
 acorn

./node_modules/acorn/dist:
 acorn.d.mts   acorn.d.ts   acorn.js   acorn.mjs   bin.js

./node_modules/agent-base:
 dist   LICENSE   package.json   README.md

./node_modules/agent-base/dist:
 helpers.d.ts       helpers.js       index.d.ts       index.js
 helpers.d.ts.map   helpers.js.map   index.d.ts.map   index.js.map

./node_modules/agentkeepalive:
 lib          History.md   index.js   package.json
 browser.js   index.d.ts   LICENSE    README.md

./node_modules/agentkeepalive/lib:
 agent.js   constants.js   https_agent.js

./node_modules/aggregate-error:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/ajv:
 dist   lib   scripts   LICENSE   package.json   README.md

./node_modules/ajv/dist:
 ajv.bundle.js   ajv.min.js   ajv.min.js.map

./node_modules/ajv/lib:
 compile   dotjs   ajv.d.ts   cache.js   definition_schema.js
 dot       refs    ajv.js     data.js    keyword.js

./node_modules/ajv/lib/compile:
 async.js   error_classes.js   index.js     rules.js        ucs2length.js
 equal.js   formats.js         resolve.js   schema_obj.js   util.js

./node_modules/ajv/lib/dot:
 _limit.jst             custom.jst         multipleOf.jst
 _limitItems.jst        defaults.def       not.jst
 _limitLength.jst       definitions.def    oneOf.jst
 _limitProperties.jst   dependencies.jst   pattern.jst
 allOf.jst              enum.jst           properties.jst
 anyOf.jst              errors.def         propertyNames.jst
 coerce.def             format.jst         ref.jst
 comment.jst            if.jst             required.jst
 const.jst              items.jst          uniqueItems.jst
 contains.jst           missing.def        validate.jst

./node_modules/ajv/lib/dotjs:
 _limit.js             const.js          index.js        propertyNames.js
 _limitItems.js        contains.js       items.js        README.md
 _limitLength.js       custom.js         multipleOf.js   ref.js
 _limitProperties.js   dependencies.js   not.js          required.js
 allOf.js              enum.js           oneOf.js        uniqueItems.js
 anyOf.js              format.js         pattern.js      validate.js
 comment.js            if.js             properties.js  

./node_modules/ajv/lib/refs:
 data.json                   json-schema-draft-07.json
 json-schema-draft-04.json   json-schema-secure.json
 json-schema-draft-06.json  

./node_modules/ajv/scripts:
 bundle.js         info            publish-built-version
 compile-dots.js   prepare-tests   travis-gh-pages

./node_modules/ajv-keywords:
 keywords            index.js   package.json
 ajv-keywords.d.ts   LICENSE    README.md

./node_modules/ajv-keywords/keywords:
 dot                 dynamicDefaults.js   range.js
 dotjs               formatMaximum.js     regexp.js
 _formatLimit.js     formatMinimum.js     select.js
 _util.js            index.js             switch.js
 allRequired.js      instanceof.js        transform.js
 anyRequired.js      oneRequired.js       typeof.js
 deepProperties.js   patternRequired.js   uniqueItemProperties.js
 deepRequired.js     prohibited.js       

./node_modules/ajv-keywords/keywords/dot:
 _formatLimit.jst   patternRequired.jst   switch.jst

./node_modules/ajv-keywords/keywords/dotjs:
 _formatLimit.js   patternRequired.js   README.md   switch.js

./node_modules/ansi-html-community:
 bin   index.js   LICENSE   package.json   README.md

./node_modules/ansi-html-community/bin:
 ansi-html

./node_modules/ansi-regex:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/ansi-styles:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/anymatch:
 index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/app-builder-bin:
 linux   win          index.js   package.json
 mac     index.d.ts   LICENSE    readme.md

./node_modules/app-builder-bin/linux:
 arm   arm64   ia32   loong64   riscv64   x64

./node_modules/app-builder-bin/linux/arm:
 app-builder

./node_modules/app-builder-bin/linux/arm64:
 app-builder

./node_modules/app-builder-bin/linux/ia32:
 app-builder

./node_modules/app-builder-bin/linux/loong64:
 app-builder

./node_modules/app-builder-bin/linux/riscv64:
 app-builder

./node_modules/app-builder-bin/linux/x64:
 app-builder

./node_modules/app-builder-bin/mac:
 app-builder_amd64   app-builder_arm64

./node_modules/app-builder-bin/win:
 arm64   ia32   x64

./node_modules/app-builder-bin/win/arm64:
 app-builder.exe

./node_modules/app-builder-bin/win/ia32:
 app-builder.exe

./node_modules/app-builder-bin/win/x64:
 app-builder.exe

./node_modules/app-builder-lib:
 certs          out         package.json   scheme.json
 node_modules   templates   README.md     

./node_modules/app-builder-lib/certs:
 root_certs.keychain

./node_modules/app-builder-lib/node_modules:
 isbinaryfile   minimatch

./node_modules/app-builder-lib/node_modules/isbinaryfile:
 lib   LICENSE.txt   package.json   README.md

./node_modules/app-builder-lib/node_modules/isbinaryfile/lib:
 index.d.ts   index.js

./node_modules/app-builder-lib/node_modules/minimatch:
 dist   LICENSE   package.json   README.md

./node_modules/app-builder-lib/node_modules/minimatch/dist:
 commonjs   esm

./node_modules/app-builder-lib/node_modules/minimatch/dist/commonjs:
 assert-valid-pattern.d.ts       brace-expressions.js       package.json
 assert-valid-pattern.d.ts.map   brace-expressions.js.map   unescape.d.ts
 assert-valid-pattern.js         escape.d.ts                unescape.d.ts.map
 assert-valid-pattern.js.map     escape.d.ts.map            unescape.js
 ast.d.ts                        escape.js                  unescape.js.map
 ast.d.ts.map                    escape.js.map             
 ast.js                          index.d.ts                
 ast.js.map                      index.d.ts.map            
 brace-expressions.d.ts          index.js                  
 brace-expressions.d.ts.map      index.js.map              

./node_modules/app-builder-lib/node_modules/minimatch/dist/esm:
 assert-valid-pattern.d.ts       brace-expressions.js       package.json
 assert-valid-pattern.d.ts.map   brace-expressions.js.map   unescape.d.ts
 assert-valid-pattern.js         escape.d.ts                unescape.d.ts.map
 assert-valid-pattern.js.map     escape.d.ts.map            unescape.js
 ast.d.ts                        escape.js                  unescape.js.map
 ast.d.ts.map                    escape.js.map             
 ast.js                          index.d.ts                
 ast.js.map                      index.d.ts.map            
 brace-expressions.d.ts          index.js                  
 brace-expressions.d.ts.map      index.js.map              

./node_modules/app-builder-lib/out:
 asar                   errorMessages.js         packager.d.ts
 codeSign               errorMessages.js.map     packager.js
 electron               fileMatcher.d.ts         packager.js.map
 frameworks             fileMatcher.js           packagerApi.d.ts
 options                fileMatcher.js.map       packagerApi.js
 presets                fileTransformer.d.ts     packagerApi.js.map
 publish                fileTransformer.js       platformPackager.d.ts
 targets                fileTransformer.js.map   platformPackager.js
 util                   forge-maker.d.ts         platformPackager.js.map
 vm                     forge-maker.js           ProtonFramework.d.ts
 appInfo.d.ts           forge-maker.js.map       ProtonFramework.js
 appInfo.js             Framework.d.ts           ProtonFramework.js.map
 appInfo.js.map         Framework.js             version.d.ts
 binDownload.d.ts       Framework.js.map         version.js
 binDownload.js         index.d.ts               version.js.map
 binDownload.js.map     index.js                 wine.d.ts
 configuration.d.ts     index.js.map             wine.js
 configuration.js       linuxPackager.d.ts       wine.js.map
 configuration.js.map   linuxPackager.js         winPackager.d.ts
 core.d.ts              linuxPackager.js.map     winPackager.js
 core.js                macPackager.d.ts         winPackager.js.map
 core.js.map            macPackager.js          
 errorMessages.d.ts     macPackager.js.map      

./node_modules/app-builder-lib/out/asar:
 asar.d.ts              asarFileChecker.js.map   integrity.js
 asar.js                asarUtil.d.ts            integrity.js.map
 asar.js.map            asarUtil.js              unpackDetector.d.ts
 asarFileChecker.d.ts   asarUtil.js.map          unpackDetector.js
 asarFileChecker.js     integrity.d.ts           unpackDetector.js.map

./node_modules/app-builder-lib/out/codeSign:
 codesign.d.ts          windowsCodeSign.js.map
 codesign.js            windowsSignAzureManager.d.ts
 codesign.js.map        windowsSignAzureManager.js
 macCodeSign.d.ts       windowsSignAzureManager.js.map
 macCodeSign.js         windowsSignToolManager.d.ts
 macCodeSign.js.map     windowsSignToolManager.js
 windowsCodeSign.d.ts   windowsSignToolManager.js.map
 windowsCodeSign.js    

./node_modules/app-builder-lib/out/electron:
 ElectronFramework.d.ts     electronMac.js.map       electronWin.js
 ElectronFramework.js       electronVersion.d.ts     electronWin.js.map
 ElectronFramework.js.map   electronVersion.js       injectFFMPEG.d.ts
 electronMac.d.ts           electronVersion.js.map   injectFFMPEG.js
 electronMac.js             electronWin.d.ts         injectFFMPEG.js.map

./node_modules/app-builder-lib/out/frameworks:
 LibUiFramework.d.ts   LibUiFramework.js   LibUiFramework.js.map

./node_modules/app-builder-lib/out/options:
 AppXOptions.d.ts                             SnapOptions.d.ts
 AppXOptions.js                               SnapOptions.js
 AppXOptions.js.map                           SnapOptions.js.map
 CommonWindowsInstallerConfiguration.d.ts     SquirrelWindowsOptions.d.ts
 CommonWindowsInstallerConfiguration.js       SquirrelWindowsOptions.js
 CommonWindowsInstallerConfiguration.js.map   SquirrelWindowsOptions.js.map
 FileAssociation.d.ts                         winOptions.d.ts
 FileAssociation.js                           winOptions.js
 FileAssociation.js.map                       winOptions.js.map
 linuxOptions.d.ts                           
 linuxOptions.js                             
 linuxOptions.js.map                         
 macOptions.d.ts                             
 macOptions.js                               
 macOptions.js.map                           
 metadata.d.ts                               
 metadata.js                                 
 metadata.js.map                             
 MsiOptions.d.ts                             
 MsiOptions.js                               
 MsiOptions.js.map                           
 MsiWrappedOptions.d.ts                      
 MsiWrappedOptions.js                        
 MsiWrappedOptions.js.map                    
 pkgOptions.d.ts                             
 pkgOptions.js                               
 pkgOptions.js.map                           
 PlatformSpecificBuildOptions.d.ts           
 PlatformSpecificBuildOptions.js             
 PlatformSpecificBuildOptions.js.map         

./node_modules/app-builder-lib/out/presets:
 rectCra.d.ts   rectCra.js   rectCra.js.map

./node_modules/app-builder-lib/out/publish:
 s3                          PublishManager.js
 BitbucketPublisher.d.ts     PublishManager.js.map
 BitbucketPublisher.js       SnapStorePublisher.d.ts
 BitbucketPublisher.js.map   SnapStorePublisher.js
 KeygenPublisher.d.ts        SnapStorePublisher.js.map
 KeygenPublisher.js          updateInfoBuilder.d.ts
 KeygenPublisher.js.map      updateInfoBuilder.js
 PublishManager.d.ts         updateInfoBuilder.js.map

./node_modules/app-builder-lib/out/publish/s3:
 BaseS3Publisher.d.ts     s3Publisher.d.ts     spacesPublisher.d.ts
 BaseS3Publisher.js       s3Publisher.js       spacesPublisher.js
 BaseS3Publisher.js.map   s3Publisher.js.map   spacesPublisher.js.map

./node_modules/app-builder-lib/out/targets:
 nsis                                   LinuxTargetHelper.js
 AppImageTarget.d.ts                    LinuxTargetHelper.js.map
 AppImageTarget.js                      MsiTarget.d.ts
 AppImageTarget.js.map                  MsiTarget.js
 AppxTarget.d.ts                        MsiTarget.js.map
 AppxTarget.js                          MsiWrappedTarget.d.ts
 AppxTarget.js.map                      MsiWrappedTarget.js
 archive.d.ts                           MsiWrappedTarget.js.map
 archive.js                             pkg.d.ts
 archive.js.map                         pkg.js
 ArchiveTarget.d.ts                     pkg.js.map
 ArchiveTarget.js                       snap.d.ts
 ArchiveTarget.js.map                   snap.js
 differentialUpdateInfoBuilder.d.ts     snap.js.map
 differentialUpdateInfoBuilder.js       targetFactory.d.ts
 differentialUpdateInfoBuilder.js.map   targetFactory.js
 FlatpakTarget.d.ts                     targetFactory.js.map
 FlatpakTarget.js                       targetUtil.d.ts
 FlatpakTarget.js.map                   targetUtil.js
 FpmTarget.d.ts                         targetUtil.js.map
 FpmTarget.js                           tools.d.ts
 FpmTarget.js.map                       tools.js
 LinuxTargetHelper.d.ts                 tools.js.map

./node_modules/app-builder-lib/out/targets/nsis:
 Commands.d.ts     nsisLicense.d.ts             NsisTarget.d.ts
 Commands.js       nsisLicense.js               NsisTarget.js
 Commands.js.map   nsisLicense.js.map           NsisTarget.js.map
 Defines.d.ts      nsisOptions.d.ts             nsisUtil.d.ts
 Defines.js        nsisOptions.js               nsisUtil.js
 Defines.js.map    nsisOptions.js.map           nsisUtil.js.map
 nsisLang.d.ts     nsisScriptGenerator.d.ts     WebInstallerTarget.d.ts
 nsisLang.js       nsisScriptGenerator.js       WebInstallerTarget.js
 nsisLang.js.map   nsisScriptGenerator.js.map   WebInstallerTarget.js.map

./node_modules/app-builder-lib/out/util:
 config                 flags.js.map                  packageMetadata.d.ts
 rebuild                hash.d.ts                     packageMetadata.js
 appBuilder.d.ts        hash.js                       packageMetadata.js.map
 appBuilder.js          hash.js.map                   pathManager.d.ts
 appBuilder.js.map      langs.d.ts                    pathManager.js
 appFileCopier.d.ts     langs.js                      pathManager.js.map
 appFileCopier.js       langs.js.map                  repositoryInfo.d.ts
 appFileCopier.js.map   license.d.ts                  repositoryInfo.js
 AppFileWalker.d.ts     license.js                    repositoryInfo.js.map
 AppFileWalker.js       license.js.map                resolve.d.ts
 AppFileWalker.js.map   macosVersion.d.ts             resolve.js
 bundledTool.d.ts       macosVersion.js               resolve.js.map
 bundledTool.js         macosVersion.js.map           timer.d.ts
 bundledTool.js.map     macroExpander.d.ts            timer.js
 cacheManager.d.ts      macroExpander.js              timer.js.map
 cacheManager.js        macroExpander.js.map          yarn.d.ts
 cacheManager.js.map    NodeModuleCopyHelper.d.ts     yarn.js
 filename.d.ts          NodeModuleCopyHelper.js       yarn.js.map
 filename.js            NodeModuleCopyHelper.js.map  
 filename.js.map        normalizePackageData.d.ts    
 filter.d.ts            normalizePackageData.js      
 filter.js              normalizePackageData.js.map  
 filter.js.map          packageDependencies.d.ts     
 flags.d.ts             packageDependencies.js       
 flags.js               packageDependencies.js.map   

./node_modules/app-builder-lib/out/util/config:
 config.d.ts   config.js.map   load.js
 config.js     load.d.ts       load.js.map

./node_modules/app-builder-lib/out/util/rebuild:
 rebuild.d.ts   rebuild.js.map        remote-rebuild.js
 rebuild.js     remote-rebuild.d.ts   remote-rebuild.js.map

./node_modules/app-builder-lib/out/vm:
 MonoVm.d.ts     ParallelsVm.d.ts     vm.d.ts     WineVm.d.ts
 MonoVm.js       ParallelsVm.js       vm.js       WineVm.js
 MonoVm.js.map   ParallelsVm.js.map   vm.js.map   WineVm.js.map

./node_modules/app-builder-lib/templates:
 appx    linux   msiWrapped   snap
 icons   msi     nsis         entitlements.mac.plist

./node_modules/app-builder-lib/templates/appx:
󰗀 appxmanifest.xml  󰗀 priconfig.xml

./node_modules/app-builder-lib/templates/icons:
 electron-linux   proton-native

./node_modules/app-builder-lib/templates/icons/electron-linux:
 16x16.png   32x32.png   48x48.png   64x64.png   128x128.png   256x256.png

./node_modules/app-builder-lib/templates/icons/proton-native:
 linux   proton-native.icns   proton-native.ico  󰕙 proton-native.svg

./node_modules/app-builder-lib/templates/icons/proton-native/linux:
 16x16.png   48x48.png   128x128.png   512x512.png
 32x32.png   64x64.png   256x256.png   1024x1024.png

./node_modules/app-builder-lib/templates/linux:
 after-install.tpl   after-remove.tpl   desktop.tpl

./node_modules/app-builder-lib/templates/msi:
󰗀 template.xml

./node_modules/app-builder-lib/templates/msiWrapped:
󰗀 template.xml

./node_modules/app-builder-lib/templates/nsis:
 include                 installer.nsi        oneClick.nsh
 assistedInstaller.nsh   installSection.nsh   portable.nsi
 assistedMessages.yml    messages.yml         README.md
 common.nsh              multiUser.nsh        uninstaller.nsh
 empty-license.txt       multiUserUi.nsh     

./node_modules/app-builder-lib/templates/nsis/include:
 allowOnlyOneInstallerInstance.nsh   installer.nsh     StrContains.nsh
 extractAppPackage.nsh               installUtil.nsh   UAC.nsh
 FileAssociation.nsh                 nsProcess.nsh     webPackage.nsh
 getProcessInfo.nsh                  StdUtils.nsh     

./node_modules/app-builder-lib/templates/snap:
 snapcraft.yaml

./node_modules/aproba:
 CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/are-we-there-yet:
 lib   LICENSE.md   package.json   README.md

./node_modules/are-we-there-yet/lib:
 index.js          tracker-group.js    tracker.js
 tracker-base.js   tracker-stream.js  

./node_modules/argparse:
 lib   argparse.js   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/argparse/lib:
 sub.js   textwrap.js

./node_modules/array-flatten:
 array-flatten.js   LICENSE   package.json   README.md

./node_modules/assert-plus:
 assert.js   AUTHORS   CHANGES.md   package.json   README.md

./node_modules/astral-regex:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/async:
 dist                 eachOfSeries.js      mapValuesLimit.js    tryEach.js
 internal             eachSeries.js        mapValuesSeries.js   unmemoize.js
 all.js               ensureAsync.js       memoize.js           until.js
 allLimit.js          every.js             nextTick.js          waterfall.js
 allSeries.js         everyLimit.js        package.json         whilst.js
 any.js               everySeries.js       parallel.js          wrapSync.js
 anyLimit.js          filter.js            parallelLimit.js    
 anySeries.js         filterLimit.js       priorityQueue.js    
 apply.js             filterSeries.js      queue.js            
 applyEach.js         find.js              race.js             
 applyEachSeries.js   findLimit.js         README.md           
 asyncify.js          findSeries.js        reduce.js           
 auto.js              flatMap.js           reduceRight.js      
 autoInject.js        flatMapLimit.js      reflect.js          
 bower.json           flatMapSeries.js     reflectAll.js       
 cargo.js             foldl.js             reject.js           
 cargoQueue.js        foldr.js             rejectLimit.js      
 CHANGELOG.md         forEach.js           rejectSeries.js     
 compose.js           forEachLimit.js      retry.js            
 concat.js            forEachOf.js         retryable.js        
 concatLimit.js       forEachOfLimit.js    select.js           
 concatSeries.js      forEachOfSeries.js   selectLimit.js      
 constant.js          forEachSeries.js     selectSeries.js     
 detect.js            forever.js           seq.js              
 detectLimit.js       groupBy.js           series.js           
 detectSeries.js      groupByLimit.js      setImmediate.js     
 dir.js               groupBySeries.js     some.js             
 doDuring.js          index.js             someLimit.js        
 doUntil.js           inject.js            someSeries.js       
 doWhilst.js          LICENSE              sortBy.js           
 during.js            log.js               timeout.js          
 each.js              map.js               times.js            
 eachLimit.js         mapLimit.js          timesLimit.js       
 eachOf.js            mapSeries.js         timesSeries.js      
 eachOfLimit.js       mapValues.js         transform.js        

./node_modules/async/dist:
 async.js   async.min.js   async.mjs

./node_modules/async/internal:
 applyEach.js          filter.js          onlyOnce.js          wrapAsync.js
 asyncEachOfLimit.js   getIterator.js     parallel.js         
 awaitify.js           Heap.js            promiseCallback.js  
 breakLoop.js          initialParams.js   queue.js            
 consoleFunc.js        isArrayLike.js     range.js            
 createTester.js       iterator.js        reject.js           
 DoublyLinkedList.js   map.js             setImmediate.js     
 eachOfLimit.js        once.js            withoutIndex.js     

./node_modules/async-exit-hook:
 CHANGELOG.md   index.js   license   package.json   readme.md

./node_modules/asynckit:
 lib        index.js   package.json   README.md   serialOrdered.js
 bench.js   LICENSE    parallel.js    serial.js   stream.js

./node_modules/asynckit/lib:
 abort.js     readable_asynckit.js         state.js
 async.js     readable_parallel.js         streamify.js
 defer.js     readable_serial.js           terminator.js
 iterate.js   readable_serial_ordered.js  

./node_modules/at-least-node:
 index.js   LICENSE   package.json   README.md

./node_modules/axios:
 dist           index.d.cts   LICENSE              README.md
 lib            index.d.ts    MIGRATION_GUIDE.md   SECURITY.md
 CHANGELOG.md   index.js      package.json        

./node_modules/axios/dist:
 browser   node       axios.js.map   axios.min.js.map
 esm       axios.js   axios.min.js  

./node_modules/axios/dist/browser:
 axios.cjs   axios.cjs.map

./node_modules/axios/dist/esm:
 axios.js   axios.js.map   axios.min.js   axios.min.js.map

./node_modules/axios/dist/node:
 axios.cjs   axios.cjs.map

./node_modules/axios/lib:
 adapters   core       env       platform   utils.js
 cancel     defaults   helpers   axios.js  

./node_modules/axios/lib/adapters:
 adapters.js   fetch.js   http.js   README.md   xhr.js

./node_modules/axios/lib/cancel:
 CanceledError.js   CancelToken.js   isCancel.js

./node_modules/axios/lib/core:
 Axios.js          buildFullPath.js        mergeConfig.js   transformData.js
 AxiosError.js     dispatchRequest.js      README.md       
 AxiosHeaders.js   InterceptorManager.js   settle.js       

./node_modules/axios/lib/defaults:
 index.js   transitional.js

./node_modules/axios/lib/env:
 classes   data.js   README.md

./node_modules/axios/lib/env/classes:
 FormData.js

./node_modules/axios/lib/helpers:
 AxiosTransformStream.js   null.js
 AxiosURLSearchParams.js   parseHeaders.js
 bind.js                   parseProtocol.js
 buildURL.js               progressEventReducer.js
 callbackify.js            readBlob.js
 combineURLs.js            README.md
 composeSignals.js         resolveConfig.js
 cookies.js                speedometer.js
 deprecatedMethod.js       spread.js
 formDataToJSON.js         throttle.js
 formDataToStream.js       toFormData.js
 fromDataURI.js            toURLEncodedForm.js
 HttpStatusCode.js         trackStream.js
 isAbsoluteURL.js          validator.js
 isAxiosError.js           ZlibHeaderTransformStream.js
 isURLSameOrigin.js       

./node_modules/axios/lib/platform:
 browser   common   node   index.js

./node_modules/axios/lib/platform/browser:
 classes   index.js

./node_modules/axios/lib/platform/browser/classes:
 Blob.js   FormData.js   URLSearchParams.js

./node_modules/axios/lib/platform/common:
 utils.js

./node_modules/axios/lib/platform/node:
 classes   index.js

./node_modules/axios/lib/platform/node/classes:
 FormData.js   URLSearchParams.js

./node_modules/babel-loader:
 lib   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/babel-loader/lib:
 cache.js   index.js          schema.json
 Error.js   injectCaller.js   transform.js

./node_modules/babel-plugin-polyfill-corejs2:
 esm   lib   node_modules   LICENSE   package.json   README.md

./node_modules/babel-plugin-polyfill-corejs2/esm:
 index.mjs   index.mjs.map

./node_modules/babel-plugin-polyfill-corejs2/lib:
 add-platform-specific-polyfills.js   helpers.js
 built-in-definitions.js              index.js

./node_modules/babel-plugin-polyfill-corejs2/node_modules:
 semver

./node_modules/babel-plugin-polyfill-corejs2/node_modules/semver:
 bin   LICENSE   package.json   range.bnf   README.md   semver.js

./node_modules/babel-plugin-polyfill-corejs2/node_modules/semver/bin:
 semver.js

./node_modules/babel-plugin-polyfill-corejs3:
 core-js-compat   esm   lib   LICENSE   package.json   README.md

./node_modules/babel-plugin-polyfill-corejs3/core-js-compat:
 data.js   entries.js   get-modules-list-for-target-version.js   README.md

./node_modules/babel-plugin-polyfill-corejs3/esm:
 index.mjs   index.mjs.map

./node_modules/babel-plugin-polyfill-corejs3/lib:
 babel-runtime-corejs3-paths.js   index.js               usage-filters.js
 built-in-definitions.js          shipped-proposals.js   utils.js

./node_modules/babel-plugin-polyfill-regenerator:
 esm   lib   LICENSE   package.json   README.md

./node_modules/babel-plugin-polyfill-regenerator/esm:
 index.mjs   index.mjs.map

./node_modules/babel-plugin-polyfill-regenerator/lib:
 index.js

./node_modules/balanced-match:
 index.js   LICENSE.md   package.json   README.md

./node_modules/base64-js:
 base64js.min.js   index.js   package.json
 index.d.ts        LICENSE    README.md

./node_modules/batch:
 component.json   index.js   Makefile       Readme.md
 History.md       LICENSE    package.json  

./node_modules/binary-extensions:
 binary-extensions.json        index.d.ts   license        readme.md
 binary-extensions.json.d.ts   index.js     package.json  

./node_modules/bl:
 test   bl.js   BufferList.js   LICENSE.md   package.json   README.md

./node_modules/bl/test:
 convert.js   indexOf.js   isBufferList.js   test.js

./node_modules/bluebird:
 js   changelog.md   LICENSE   package.json   README.md

./node_modules/bluebird/js:
 browser   release

./node_modules/bluebird/js/browser:
 bluebird.core.js   bluebird.core.min.js   bluebird.js   bluebird.min.js

./node_modules/bluebird/js/release:
 any.js              errors.js          promisify.js                util.js
 assert.js           es5.js             props.js                   
 async.js            filter.js          queue.js                   
 bind.js             finally.js         race.js                    
 bluebird.js         generators.js      reduce.js                  
 call_get.js         join.js            schedule.js                
 cancel.js           map.js             settle.js                  
 catch_filter.js     method.js          some.js                    
 context.js          nodeback.js        synchronous_inspection.js  
 debuggability.js    nodeify.js         thenables.js               
 direct_resolve.js   promise.js         timers.js                  
 each.js             promise_array.js   using.js                   

./node_modules/bluebird-lst:
 index.d.ts   index.js   package.json

./node_modules/body-parser:
 lib            HISTORY.md   LICENSE        README.md
 node_modules   index.js     package.json   SECURITY.md

./node_modules/body-parser/lib:
 types   read.js

./node_modules/body-parser/lib/types:
 json.js   raw.js   text.js   urlencoded.js

./node_modules/body-parser/node_modules:
 debug   iconv-lite   ms

./node_modules/body-parser/node_modules/debug:
 src            component.json   LICENSE    node.js        README.md
 CHANGELOG.md   karma.conf.js    Makefile   package.json  

./node_modules/body-parser/node_modules/debug/src:
 browser.js   debug.js   index.js   inspector-log.js   node.js

./node_modules/body-parser/node_modules/iconv-lite:
 encodings   lib   Changelog.md   LICENSE   package.json   README.md

./node_modules/body-parser/node_modules/iconv-lite/encodings:
 tables          index.js        sbcs-data-generated.js   utf16.js
 dbcs-codec.js   internal.js     sbcs-data.js            
 dbcs-data.js    sbcs-codec.js   utf7.js                 

./node_modules/body-parser/node_modules/iconv-lite/encodings/tables:
 big5-added.json   cp949.json   eucjp.json            gbk-added.json
 cp936.json        cp950.json   gb18030-ranges.json   shiftjis.json

./node_modules/body-parser/node_modules/iconv-lite/lib:
 bom-handling.js   extend-node.js   index.d.ts   index.js   streams.js

./node_modules/body-parser/node_modules/ms:
 index.js   license.md   package.json   readme.md

./node_modules/bonjour-service:
 dist   types   LICENSE   package.json   README.md

./node_modules/bonjour-service/dist:
 lib   index.d.ts   index.js   index.js.map

./node_modules/bonjour-service/dist/lib:
 utils            KeyValue.d.ts        registry.js            service.js.map
 browser.d.ts     KeyValue.js          registry.js.map       
 browser.js       KeyValue.js.map      service-types.d.ts    
 browser.js.map   mdns-server.d.ts     service-types.js      
 dns-txt.d.ts     mdns-server.js       service-types.js.map  
 dns-txt.js       mdns-server.js.map   service.d.ts          
 dns-txt.js.map   registry.d.ts        service.js            

./node_modules/bonjour-service/dist/lib/utils:
 dns-equal.d.ts     equal-txt.js          filter-service.js.map
 dns-equal.js       equal-txt.js.map      filter-txt.d.ts
 dns-equal.js.map   filter-service.d.ts   filter-txt.js
 equal-txt.d.ts     filter-service.js     filter-txt.js.map

./node_modules/bonjour-service/types:
 multicast-dns.d.ts

./node_modules/boolean:
 build   CHANGELOG.md   licenseCheck.json   README.md
 lib     LICENSE.txt    package.json        tsconfig.json

./node_modules/boolean/build:
 lib

./node_modules/boolean/build/lib:
 boolean.d.ts   index.d.ts   isBooleanable.d.ts
 boolean.js     index.js     isBooleanable.js

./node_modules/boolean/lib:
 boolean.ts   index.ts   isBooleanable.ts

./node_modules/brace-expansion:
 index.js   LICENSE   package.json   README.md

./node_modules/braces:
 lib   index.js   LICENSE   package.json   README.md

./node_modules/braces/lib:
 compile.js     expand.js   stringify.js
 constants.js   parse.js    utils.js

./node_modules/browserslist:
 browser.js   error.d.ts   index.d.ts   LICENSE   package.json   README.md
 cli.js       error.js     index.js     node.js   parse.js      

./node_modules/buffer:
 AUTHORS.md   index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/buffer-crc32:
 index.js   LICENSE   package.json   README.md

./node_modules/buffer-from:
 index.js   LICENSE   package.json   readme.md

./node_modules/builder-util:
 out   LICENSE   package.json   readme.md

./node_modules/builder-util/out:
 7za.d.ts                  DebugLogger.js       log.js.map
 7za.js                    DebugLogger.js.map   nodeHttpExecutor.d.ts
 7za.js.map                deepAssign.d.ts      nodeHttpExecutor.js
 arch.d.ts                 deepAssign.js        nodeHttpExecutor.js.map
 arch.js                   deepAssign.js.map    promise.d.ts
 arch.js.map               fs.d.ts              promise.js
 asyncTaskManager.d.ts     fs.js                promise.js.map
 asyncTaskManager.js       fs.js.map            util.d.ts
 asyncTaskManager.js.map   log.d.ts             util.js
 DebugLogger.d.ts          log.js               util.js.map

./node_modules/builder-util-runtime:
 out   LICENSE   package.json   readme.md

./node_modules/builder-util-runtime/out:
 blockMapApi.d.ts                 ProgressCallbackTransform.js.map
 blockMapApi.js                   publishOptions.d.ts
 blockMapApi.js.map               publishOptions.js
 CancellationToken.d.ts           publishOptions.js.map
 CancellationToken.js             retry.d.ts
 CancellationToken.js.map         retry.js
 error.d.ts                       retry.js.map
 error.js                         rfc2253Parser.d.ts
 error.js.map                     rfc2253Parser.js
 httpExecutor.d.ts                rfc2253Parser.js.map
 httpExecutor.js                  updateInfo.d.ts
 httpExecutor.js.map              updateInfo.js
 index.d.ts                       updateInfo.js.map
 index.js                         uuid.d.ts
 index.js.map                     uuid.js
 MemoLazy.d.ts                    uuid.js.map
 MemoLazy.js                      xml.d.ts
 MemoLazy.js.map                  xml.js
 ProgressCallbackTransform.d.ts   xml.js.map
 ProgressCallbackTransform.js    

./node_modules/bundle-name:
 index.js   license   package.json   readme.md

./node_modules/bytes:
 History.md   index.js   LICENSE   package.json   Readme.md

./node_modules/cacache:
 lib   node_modules   LICENSE.md   package.json   README.md

./node_modules/cacache/lib:
 content   entry-index.js   index.js         put.js   verify.js
 util      get.js           memoization.js   rm.js   

./node_modules/cacache/lib/content:
 path.js   read.js   rm.js   write.js

./node_modules/cacache/lib/util:
 glob.js   hash-to-segments.js   tmp.js

./node_modules/cacache/node_modules:
 chownr   fs-minipass   minipass-collect   mkdirp   tar   yallist

./node_modules/cacache/node_modules/chownr:
 dist   LICENSE.md   package.json   README.md

./node_modules/cacache/node_modules/chownr/dist:
 commonjs   esm

./node_modules/cacache/node_modules/chownr/dist/commonjs:
 index.d.ts   index.d.ts.map   index.js   index.js.map   package.json

./node_modules/cacache/node_modules/chownr/dist/esm:
 index.d.ts   index.d.ts.map   index.js   index.js.map   package.json

./node_modules/cacache/node_modules/fs-minipass:
 lib   LICENSE   package.json   README.md

./node_modules/cacache/node_modules/fs-minipass/lib:
 index.js

./node_modules/cacache/node_modules/minipass-collect:
 index.js   LICENSE   package.json   README.md

./node_modules/cacache/node_modules/mkdirp:
 dist   LICENSE   package.json   readme.markdown

./node_modules/cacache/node_modules/mkdirp/dist:
 cjs   mjs

./node_modules/cacache/node_modules/mkdirp/dist/cjs:
 src   package.json

./node_modules/cacache/node_modules/mkdirp/dist/cjs/src:
 bin.d.ts             index.js.map             opts-arg.js
 bin.d.ts.map         mkdirp-manual.d.ts       opts-arg.js.map
 bin.js               mkdirp-manual.d.ts.map   path-arg.d.ts
 bin.js.map           mkdirp-manual.js         path-arg.d.ts.map
 find-made.d.ts       mkdirp-manual.js.map     path-arg.js
 find-made.d.ts.map   mkdirp-native.d.ts       path-arg.js.map
 find-made.js         mkdirp-native.d.ts.map   use-native.d.ts
 find-made.js.map     mkdirp-native.js         use-native.d.ts.map
 index.d.ts           mkdirp-native.js.map     use-native.js
 index.d.ts.map       opts-arg.d.ts            use-native.js.map
 index.js             opts-arg.d.ts.map       

./node_modules/cacache/node_modules/mkdirp/dist/mjs:
 find-made.d.ts           mkdirp-manual.js         package.json
 find-made.d.ts.map       mkdirp-manual.js.map     path-arg.d.ts
 find-made.js             mkdirp-native.d.ts       path-arg.d.ts.map
 find-made.js.map         mkdirp-native.d.ts.map   path-arg.js
 index.d.ts               mkdirp-native.js         path-arg.js.map
 index.d.ts.map           mkdirp-native.js.map     use-native.d.ts
 index.js                 opts-arg.d.ts            use-native.d.ts.map
 index.js.map             opts-arg.d.ts.map        use-native.js
 mkdirp-manual.d.ts       opts-arg.js              use-native.js.map
 mkdirp-manual.d.ts.map   opts-arg.js.map         

./node_modules/cacache/node_modules/tar:
 dist   LICENSE   package.json   README.md

./node_modules/cacache/node_modules/tar/dist:
 commonjs   esm

./node_modules/cacache/node_modules/tar/dist/commonjs:
 create.d.ts                       pack.js.map
 create.d.ts.map                   package.json
 create.js                         parse.d.ts
 create.js.map                     parse.d.ts.map
 cwd-error.d.ts                    parse.js
 cwd-error.d.ts.map                parse.js.map
 cwd-error.js                      path-reservations.d.ts
 cwd-error.js.map                  path-reservations.d.ts.map
 extract.d.ts                      path-reservations.js
 extract.d.ts.map                  path-reservations.js.map
 extract.js                        pax.d.ts
 extract.js.map                    pax.d.ts.map
 get-write-flag.d.ts               pax.js
 get-write-flag.d.ts.map           pax.js.map
 get-write-flag.js                 read-entry.d.ts
 get-write-flag.js.map             read-entry.d.ts.map
 header.d.ts                       read-entry.js
 header.d.ts.map                   read-entry.js.map
 header.js                         replace.d.ts
 header.js.map                     replace.d.ts.map
 index.d.ts                        replace.js
 index.d.ts.map                    replace.js.map
 index.js                          strip-absolute-path.d.ts
 index.js.map                      strip-absolute-path.d.ts.map
 large-numbers.d.ts                strip-absolute-path.js
 large-numbers.d.ts.map            strip-absolute-path.js.map
 large-numbers.js                  strip-trailing-slashes.d.ts
 large-numbers.js.map              strip-trailing-slashes.d.ts.map
 list.d.ts                         strip-trailing-slashes.js
 list.d.ts.map                     strip-trailing-slashes.js.map
 list.js                           symlink-error.d.ts
 list.js.map                       symlink-error.d.ts.map
 make-command.d.ts                 symlink-error.js
 make-command.d.ts.map             symlink-error.js.map
 make-command.js                   types.d.ts
 make-command.js.map               types.d.ts.map
 mkdir.d.ts                        types.js
 mkdir.d.ts.map                    types.js.map
 mkdir.js                          unpack.d.ts
 mkdir.js.map                      unpack.d.ts.map
 mode-fix.d.ts                     unpack.js
 mode-fix.d.ts.map                 unpack.js.map
 mode-fix.js                       update.d.ts
 mode-fix.js.map                   update.d.ts.map
 normalize-unicode.d.ts            update.js
 normalize-unicode.d.ts.map        update.js.map
 normalize-unicode.js              warn-method.d.ts
 normalize-unicode.js.map          warn-method.d.ts.map
 normalize-windows-path.d.ts       warn-method.js
 normalize-windows-path.d.ts.map   warn-method.js.map
 normalize-windows-path.js         winchars.d.ts
 normalize-windows-path.js.map     winchars.d.ts.map
 options.d.ts                      winchars.js
 options.d.ts.map                  winchars.js.map
 options.js                        write-entry.d.ts
 options.js.map                    write-entry.d.ts.map
 pack.d.ts                         write-entry.js
 pack.d.ts.map                     write-entry.js.map
 pack.js                          

./node_modules/cacache/node_modules/tar/dist/esm:
 create.d.ts                       pack.js.map
 create.d.ts.map                   package.json
 create.js                         parse.d.ts
 create.js.map                     parse.d.ts.map
 cwd-error.d.ts                    parse.js
 cwd-error.d.ts.map                parse.js.map
 cwd-error.js                      path-reservations.d.ts
 cwd-error.js.map                  path-reservations.d.ts.map
 extract.d.ts                      path-reservations.js
 extract.d.ts.map                  path-reservations.js.map
 extract.js                        pax.d.ts
 extract.js.map                    pax.d.ts.map
 get-write-flag.d.ts               pax.js
 get-write-flag.d.ts.map           pax.js.map
 get-write-flag.js                 read-entry.d.ts
 get-write-flag.js.map             read-entry.d.ts.map
 header.d.ts                       read-entry.js
 header.d.ts.map                   read-entry.js.map
 header.js                         replace.d.ts
 header.js.map                     replace.d.ts.map
 index.d.ts                        replace.js
 index.d.ts.map                    replace.js.map
 index.js                          strip-absolute-path.d.ts
 index.js.map                      strip-absolute-path.d.ts.map
 large-numbers.d.ts                strip-absolute-path.js
 large-numbers.d.ts.map            strip-absolute-path.js.map
 large-numbers.js                  strip-trailing-slashes.d.ts
 large-numbers.js.map              strip-trailing-slashes.d.ts.map
 list.d.ts                         strip-trailing-slashes.js
 list.d.ts.map                     strip-trailing-slashes.js.map
 list.js                           symlink-error.d.ts
 list.js.map                       symlink-error.d.ts.map
 make-command.d.ts                 symlink-error.js
 make-command.d.ts.map             symlink-error.js.map
 make-command.js                   types.d.ts
 make-command.js.map               types.d.ts.map
 mkdir.d.ts                        types.js
 mkdir.d.ts.map                    types.js.map
 mkdir.js                          unpack.d.ts
 mkdir.js.map                      unpack.d.ts.map
 mode-fix.d.ts                     unpack.js
 mode-fix.d.ts.map                 unpack.js.map
 mode-fix.js                       update.d.ts
 mode-fix.js.map                   update.d.ts.map
 normalize-unicode.d.ts            update.js
 normalize-unicode.d.ts.map        update.js.map
 normalize-unicode.js              warn-method.d.ts
 normalize-unicode.js.map          warn-method.d.ts.map
 normalize-windows-path.d.ts       warn-method.js
 normalize-windows-path.d.ts.map   warn-method.js.map
 normalize-windows-path.js         winchars.d.ts
 normalize-windows-path.js.map     winchars.d.ts.map
 options.d.ts                      winchars.js
 options.d.ts.map                  winchars.js.map
 options.js                        write-entry.d.ts
 options.js.map                    write-entry.d.ts.map
 pack.d.ts                         write-entry.js
 pack.d.ts.map                     write-entry.js.map
 pack.js                          

./node_modules/cacache/node_modules/yallist:
 dist   LICENSE.md   package.json   README.md

./node_modules/cacache/node_modules/yallist/dist:
 commonjs   esm

./node_modules/cacache/node_modules/yallist/dist/commonjs:
 index.d.ts   index.d.ts.map   index.js   index.js.map   package.json

./node_modules/cacache/node_modules/yallist/dist/esm:
 index.d.ts   index.d.ts.map   index.js   index.js.map   package.json

./node_modules/cacheable-lookup:
 source   index.d.ts   LICENSE   package.json   README.md

./node_modules/cacheable-lookup/source:
 index.js

./node_modules/cacheable-request:
 src   LICENSE   package.json   README.md

./node_modules/cacheable-request/src:
 index.js

./node_modules/call-bind-apply-helpers:
 test               CHANGELOG.md         index.d.ts     reflectApply.d.ts
 actualApply.d.ts   functionApply.d.ts   index.js       reflectApply.js
 actualApply.js     functionApply.js     LICENSE        tsconfig.json
 applyBind.d.ts     functionCall.d.ts    package.json  
 applyBind.js       functionCall.js      README.md     

./node_modules/call-bind-apply-helpers/test:
 index.js

./node_modules/call-bound:
 test           index.d.ts   LICENSE        README.md
 CHANGELOG.md   index.js     package.json   tsconfig.json

./node_modules/call-bound/test:
 index.js

./node_modules/caniuse-lite:
 data   dist   LICENSE   package.json   README.md

./node_modules/caniuse-lite/data:
 features   agents.js     browserVersions.js
 regions    browsers.js   features.js

./node_modules/caniuse-lite/data/features:
 aac.js                               html-media-capture.js
 abortcontroller.js                   html5semantic.js
 ac3-ec3.js                           http-live-streaming.js
 accelerometer.js                     http2.js
 addeventlistener.js                  http3.js
 alternate-stylesheet.js              iframe-sandbox.js
 ambient-light.js                     iframe-seamless.js
 apng.js                              iframe-srcdoc.js
 array-find-index.js                  imagecapture.js
 array-find.js                        ime.js
 array-flat.js                        img-naturalwidth-naturalheight.js
 array-includes.js                    import-maps.js
 arrow-functions.js                   imports.js
 asmjs.js                             indeterminate-checkbox.js
 async-clipboard.js                   indexeddb.js
 async-functions.js                   indexeddb2.js
 atob-btoa.js                         inline-block.js
 audio-api.js                         innertext.js
 audio.js                             input-autocomplete-onoff.js
 audiotracks.js                       input-color.js
 autofocus.js                         input-datetime.js
 auxclick.js                          input-email-tel-url.js
 av1.js                               input-event.js
 avif.js                              input-file-accept.js
 background-attachment.js             input-file-directory.js
 background-clip-text.js              input-file-multiple.js
 background-img-opts.js               input-inputmode.js
 background-position-x-y.js           input-minlength.js
 background-repeat-round-space.js     input-number.js
 background-sync.js                   input-pattern.js
 battery-status.js                    input-placeholder.js
 beacon.js                            input-range.js
 beforeafterprint.js                  input-search.js
 bigint.js                            input-selection.js
 blobbuilder.js                       insert-adjacent.js
 bloburls.js                          insertadjacenthtml.js
 border-image.js                      internationalization.js
 border-radius.js                     intersectionobserver-v2.js
 broadcastchannel.js                  intersectionobserver.js
 brotli.js                            intl-pluralrules.js
 calc.js                              intrinsic-width.js
 canvas-blending.js                   jpeg2000.js
 canvas-text.js                       jpegxl.js
 canvas.js                            jpegxr.js
 ch-unit.js                           js-regexp-lookbehind.js
 chacha20-poly1305.js                 json.js
 channel-messaging.js                 justify-content-space-evenly.js
 childnode-remove.js                  kerning-pairs-ligatures.js
 classlist.js                         keyboardevent-charcode.js
 client-hints-dpr-width-viewport.js   keyboardevent-code.js
 clipboard.js                         keyboardevent-getmodifierstate.js
 colr-v1.js                           keyboardevent-key.js
 colr.js                              keyboardevent-location.js
 comparedocumentposition.js           keyboardevent-which.js
 console-basic.js                     lazyload.js
 console-time.js                      let.js
 const.js                             link-icon-png.js
 constraint-validation.js             link-icon-svg.js
 contenteditable.js                   link-rel-dns-prefetch.js
 contentsecuritypolicy.js             link-rel-modulepreload.js
 contentsecuritypolicy2.js            link-rel-preconnect.js
 cookie-store-api.js                  link-rel-prefetch.js
 cors.js                              link-rel-preload.js
 createimagebitmap.js                 link-rel-prerender.js
 credential-management.js             loading-lazy-attr.js
 cryptography.js                      localecompare.js
 css-all.js                           magnetometer.js
 css-anchor-positioning.js            matchesselector.js
 css-animation.js                     matchmedia.js
 css-any-link.js                      mathml.js
 css-appearance.js                    maxlength.js
 css-at-counter-style.js              mdn-css-backdrop-pseudo-element.js
 css-autofill.js                      mdn-css-unicode-bidi-isolate-override.js
 css-backdrop-filter.js               mdn-css-unicode-bidi-isolate.js
 css-background-offsets.js            mdn-css-unicode-bidi-plaintext.js
 css-backgroundblendmode.js           mdn-text-decoration-color.js
 css-boxdecorationbreak.js            mdn-text-decoration-line.js
 css-boxshadow.js                     mdn-text-decoration-shorthand.js
 css-canvas.js                        mdn-text-decoration-style.js
 css-caret-color.js                   media-fragments.js
 css-cascade-layers.js                mediacapture-fromelement.js
 css-cascade-scope.js                 mediarecorder.js
 css-case-insensitive.js              mediasource.js
 css-clip-path.js                     menu.js
 css-color-adjust.js                  meta-theme-color.js
 css-color-function.js                meter.js
 css-conic-gradients.js               midi.js
 css-container-queries-style.js       minmaxwh.js
 css-container-queries.js             mp3.js
 css-container-query-units.js         mpeg-dash.js
 css-containment.js                   mpeg4.js
 css-content-visibility.js            multibackgrounds.js
 css-counters.js                      multicolumn.js
 css-crisp-edges.js                   mutation-events.js
 css-cross-fade.js                    mutationobserver.js
 css-default-pseudo.js                namevalue-storage.js
 css-descendant-gtgt.js               native-filesystem-api.js
 css-deviceadaptation.js              nav-timing.js
 css-dir-pseudo.js                    netinfo.js
 css-display-contents.js              notifications.js
 css-element-function.js              object-entries.js
 css-env-function.js                  object-fit.js
 css-exclusions.js                    object-observe.js
 css-featurequeries.js                object-values.js
 css-file-selector-button.js          objectrtc.js
 css-filter-function.js               offline-apps.js
 css-filters.js                       offscreencanvas.js
 css-first-letter.js                  ogg-vorbis.js
 css-first-line.js                    ogv.js
 css-fixed.js                         ol-reversed.js
 css-focus-visible.js                 once-event-listener.js
 css-focus-within.js                  online-status.js
 css-font-palette.js                  opus.js
 css-font-rendering-controls.js       orientation-sensor.js
 css-font-stretch.js                  outline.js
 css-gencontent.js                    pad-start-end.js
 css-gradients.js                     page-transition-events.js
 css-grid-animation.js                pagevisibility.js
 css-grid.js                          passive-event-listener.js
 css-hanging-punctuation.js           passkeys.js
 css-has.js                           passwordrules.js
 css-hyphens.js                       path2d.js
 css-image-orientation.js             payment-request.js
 css-image-set.js                     pdf-viewer.js
 css-in-out-of-range.js               permissions-api.js
 css-indeterminate-pseudo.js          permissions-policy.js
 css-initial-letter.js                picture-in-picture.js
 css-initial-value.js                 picture.js
 css-lch-lab.js                       ping.js
 css-letter-spacing.js                png-alpha.js
 css-line-clamp.js                    pointer-events.js
 css-logical-props.js                 pointer.js
 css-marker-pseudo.js                 pointerlock.js
 css-masks.js                         portals.js
 css-matches-pseudo.js                prefers-color-scheme.js
 css-math-functions.js                prefers-reduced-motion.js
 css-media-interaction.js             progress.js
 css-media-range-syntax.js            promise-finally.js
 css-media-resolution.js              promises.js
 css-media-scripting.js               proximity.js
 css-mediaqueries.js                  proxy.js
 css-mixblendmode.js                  publickeypinning.js
 css-module-scripts.js                push-api.js
 css-motion-paths.js                  queryselector.js
 css-namespaces.js                    readonly-attr.js
 css-nesting.js                       referrer-policy.js
 css-not-sel-list.js                  registerprotocolhandler.js
 css-nth-child-of.js                  rel-noopener.js
 css-opacity.js                       rel-noreferrer.js
 css-optional-pseudo.js               rellist.js
 css-overflow-anchor.js               rem.js
 css-overflow-overlay.js              requestanimationframe.js
 css-overflow.js                      requestidlecallback.js
 css-overscroll-behavior.js           resizeobserver.js
 css-page-break.js                    resource-timing.js
 css-paged-media.js                   rest-parameters.js
 css-paint-api.js                     rtcpeerconnection.js
 css-placeholder-shown.js             ruby.js
 css-placeholder.js                   run-in.js
 css-print-color-adjust.js            same-site-cookie-attribute.js
 css-read-only-write.js               screen-orientation.js
 css-rebeccapurple.js                 script-async.js
 css-reflections.js                   script-defer.js
 css-regions.js                       scrollintoview.js
 css-relative-colors.js               scrollintoviewifneeded.js
 css-repeating-gradients.js           sdch.js
 css-resize.js                        selection-api.js
 css-revert-value.js                  selectlist.js
 css-rrggbbaa.js                      server-timing.js
 css-scroll-behavior.js               serviceworkers.js
 css-scrollbar.js                     setimmediate.js
 css-sel2.js                          shadowdom.js
 css-sel3.js                          shadowdomv1.js
 css-selection.js                     sharedarraybuffer.js
 css-shapes.js                        sharedworkers.js
 css-snappoints.js                    sni.js
 css-sticky.js                        spdy.js
 css-subgrid.js                       speech-recognition.js
 css-supports-api.js                  speech-synthesis.js
 css-table.js                         spellcheck-attribute.js
 css-text-align-last.js               sql-storage.js
 css-text-box-trim.js                 srcset.js
 css-text-indent.js                   stream.js
 css-text-justify.js                  streams.js
 css-text-orientation.js              stricttransportsecurity.js
 css-text-spacing.js                  style-scoped.js
 css-text-wrap-balance.js             subresource-bundling.js
 css-textshadow.js                    subresource-integrity.js
 css-touch-action.js                  svg-css.js
 css-transitions.js                   svg-filters.js
 css-unicode-bidi.js                  svg-fonts.js
 css-unset-value.js                   svg-fragment.js
 css-variables.js                     svg-html.js
 css-when-else.js                     svg-html5.js
 css-widows-orphans.js                svg-img.js
 css-width-stretch.js                 svg-smil.js
 css-writing-mode.js                  svg.js
 css-zoom.js                          sxg.js
 css3-attr.js                         tabindex-attr.js
 css3-boxsizing.js                    template-literals.js
 css3-colors.js                       template.js
 css3-cursors-grab.js                 temporal.js
 css3-cursors-newer.js                testfeat.js
 css3-cursors.js                      text-decoration.js
 css3-tabsize.js                      text-emphasis.js
 currentcolor.js                      text-overflow.js
 custom-elements.js                   text-size-adjust.js
 custom-elementsv1.js                 text-stroke.js
 customevent.js                       textcontent.js
 datalist.js                          textencoder.js
 dataset.js                           tls1-1.js
 datauri.js                           tls1-2.js
 date-tolocaledatestring.js           tls1-3.js
 declarative-shadow-dom.js            touch.js
 decorators.js                        transforms2d.js
 details.js                           transforms3d.js
 deviceorientation.js                 trusted-types.js
 devicepixelratio.js                  ttf.js
 dialog.js                            typedarrays.js
 dispatchevent.js                     u2f.js
 dnssec.js                            unhandledrejection.js
 do-not-track.js                      upgradeinsecurerequests.js
 document-currentscript.js            url-scroll-to-text-fragment.js
 document-evaluate-xpath.js           url.js
 document-execcommand.js              urlsearchparams.js
 document-policy.js                   use-strict.js
 document-scrollingelement.js         user-select-none.js
 documenthead.js                      user-timing.js
 dom-manip-convenience.js             variable-fonts.js
 dom-range.js                         vector-effect.js
 domcontentloaded.js                  vibration.js
 dommatrix.js                         video.js
 download.js                          videotracks.js
 dragndrop.js                         view-transitions.js
 element-closest.js                   viewport-unit-variants.js
 element-from-point.js                viewport-units.js
 element-scroll-methods.js            wai-aria.js
 eme.js                               wake-lock.js
 eot.js                               wasm-bigint.js
 es5.js                               wasm-bulk-memory.js
 es6-class.js                         wasm-extended-const.js
 es6-generators.js                    wasm-gc.js
 es6-module-dynamic-import.js         wasm-multi-memory.js
 es6-module.js                        wasm-multi-value.js
 es6-number.js                        wasm-mutable-globals.js
 es6-string-includes.js               wasm-nontrapping-fptoint.js
 es6.js                               wasm-reference-types.js
 eventsource.js                       wasm-relaxed-simd.js
 extended-system-fonts.js             wasm-signext.js
 feature-policy.js                    wasm-simd.js
 fetch.js                             wasm-tail-calls.js
 fieldset-disabled.js                 wasm-threads.js
 fileapi.js                           wasm.js
 filereader.js                        wav.js
 filereadersync.js                    wbr-element.js
 filesystem.js                        web-animation.js
 flac.js                              web-app-manifest.js
 flexbox-gap.js                       web-bluetooth.js
 flexbox.js                           web-serial.js
 flow-root.js                         web-share.js
 focusin-focusout-events.js           webauthn.js
 font-family-system-ui.js             webcodecs.js
 font-feature.js                      webgl.js
 font-kerning.js                      webgl2.js
 font-loading.js                      webgpu.js
 font-size-adjust.js                  webhid.js
 font-smooth.js                       webkit-user-drag.js
 font-unicode-range.js                webm.js
 font-variant-alternates.js           webnfc.js
 font-variant-numeric.js              webp.js
 fontface.js                          websockets.js
 form-attribute.js                    webtransport.js
 form-submit-attributes.js            webusb.js
 form-validation.js                   webvr.js
 forms.js                             webvtt.js
 fullscreen.js                        webworkers.js
 gamepad.js                           webxr.js
 geolocation.js                       will-change.js
 getboundingclientrect.js             woff.js
 getcomputedstyle.js                  woff2.js
 getelementsbyclassname.js            word-break.js
 getrandomvalues.js                   wordwrap.js
 gyroscope.js                         x-doc-messaging.js
 hardwareconcurrency.js               x-frame-options.js
 hashchange.js                        xhr2.js
 heif.js                              xhtml.js
 hevc.js                              xhtmlsmil.js
 hidden.js                            xml-serializer.js
 high-resolution-time.js              zstd.js
 history.js                          

./node_modules/caniuse-lite/data/regions:
 AD.js       BI.js   DK.js   GT.js   KW.js   MU.js   PT.js   TH.js
 AE.js       BJ.js   DM.js   GU.js   KY.js   MV.js   PW.js   TJ.js
 AF.js       BM.js   DO.js   GW.js   KZ.js   MW.js   PY.js   TL.js
 AG.js       BN.js   DZ.js   GY.js   LA.js   MX.js   QA.js   TM.js
 AI.js       BO.js   EC.js   HK.js   LB.js   MY.js   RE.js   TN.js
 AL.js       BR.js   EE.js   HN.js   LC.js   MZ.js   RO.js   TO.js
 alt-af.js   BS.js   EG.js   HR.js   LI.js   NA.js   RS.js   TR.js
 alt-an.js   BT.js   ER.js   HT.js   LK.js   NC.js   RU.js   TT.js
 alt-as.js   BW.js   ES.js   HU.js   LR.js   NE.js   RW.js   TV.js
 alt-eu.js   BY.js   ET.js   ID.js   LS.js   NF.js   SA.js   TW.js
 alt-na.js   BZ.js   FI.js   IE.js   LT.js   NG.js   SB.js   TZ.js
 alt-oc.js   CA.js   FJ.js   IL.js   LU.js   NI.js   SC.js   UA.js
 alt-sa.js   CD.js   FK.js   IM.js   LV.js   NL.js   SD.js   UG.js
 alt-ww.js   CF.js   FM.js   IN.js   LY.js   NO.js   SE.js   US.js
 AM.js       CG.js   FO.js   IQ.js   MA.js   NP.js   SG.js   UY.js
 AO.js       CH.js   FR.js   IR.js   MC.js   NR.js   SH.js   UZ.js
 AR.js       CI.js   GA.js   IS.js   MD.js   NU.js   SI.js   VA.js
 AS.js       CK.js   GB.js   IT.js   ME.js   NZ.js   SK.js   VC.js
 AT.js       CL.js   GD.js   JE.js   MG.js   OM.js   SL.js   VE.js
 AU.js       CM.js   GE.js   JM.js   MH.js   PA.js   SM.js   VG.js
 AW.js       CN.js   GF.js   JO.js   MK.js   PE.js   SN.js   VI.js
 AX.js       CO.js   GG.js   JP.js   ML.js   PF.js   SO.js   VN.js
 AZ.js       CR.js   GH.js   KE.js   MM.js   PG.js   SR.js   VU.js
 BA.js       CU.js   GI.js   KG.js   MN.js   PH.js   ST.js   WF.js
 BB.js       CV.js   GL.js   KH.js   MO.js   PK.js   SV.js   WS.js
 BD.js       CX.js   GM.js   KI.js   MP.js   PL.js   SY.js   YE.js
 BE.js       CY.js   GN.js   KM.js   MQ.js   PM.js   SZ.js   YT.js
 BF.js       CZ.js   GP.js   KN.js   MR.js   PN.js   TC.js   ZA.js
 BG.js       DE.js   GQ.js   KP.js   MS.js   PR.js   TD.js   ZM.js
 BH.js       DJ.js   GR.js   KR.js   MT.js   PS.js   TG.js   ZW.js

./node_modules/caniuse-lite/dist:
 lib   unpacker

./node_modules/caniuse-lite/dist/lib:
 statuses.js   supported.js

./node_modules/caniuse-lite/dist/unpacker:
 agents.js     browserVersions.js   features.js   region.js
 browsers.js   feature.js           index.js     

./node_modules/chalk:
 node_modules   source   index.d.ts   license   package.json   readme.md

./node_modules/chalk/node_modules:
 supports-color

./node_modules/chalk/node_modules/supports-color:
 browser.js   index.js   license   package.json   readme.md

./node_modules/chalk/source:
 index.js   templates.js   util.js

./node_modules/chokidar:
 lib   types   index.js   LICENSE   package.json   README.md

./node_modules/chokidar/lib:
 constants.js   fsevents-handler.js   nodefs-handler.js

./node_modules/chokidar/types:
 index.d.ts

./node_modules/chownr:
 chownr.js   LICENSE   package.json   README.md

./node_modules/chrome-trace-event:
 dist   CHANGES.md   LICENSE.txt   package.json   README.md

./node_modules/chrome-trace-event/dist:
 trace-event.d.ts   trace-event.js

./node_modules/chromium-pickle-js:
 lib   package.json   README.md

./node_modules/chromium-pickle-js/lib:
 exports.js   pickle.js

./node_modules/ci-info:
 CHANGELOG.md   index.js   package.json   vendors.json
 index.d.ts     LICENSE    README.md     

./node_modules/clean-stack:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/cli-cursor:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/cli-spinners:
 index.d.ts   license        readme.md
 index.js     package.json   spinners.json

./node_modules/cli-truncate:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/cliui:
 build   CHANGELOG.md   index.mjs   LICENSE.txt   package.json   README.md

./node_modules/cliui/build:
 lib   index.cjs   index.d.cts

./node_modules/cliui/build/lib:
 index.js   string-utils.js

./node_modules/clone:
 clone.iml   clone.js   LICENSE   package.json   README.md

./node_modules/clone-deep:
 index.js   LICENSE   package.json   README.md

./node_modules/clone-response:
 src   LICENSE   package.json   README.md

./node_modules/clone-response/src:
 index.js

./node_modules/color-convert:
 CHANGELOG.md     index.js   package.json   route.js
 conversions.js   LICENSE    README.md     

./node_modules/color-name:
 index.js   LICENSE   package.json   README.md

./node_modules/color-support:
 bin.js   browser.js   index.js   LICENSE   package.json   README.md

./node_modules/colorette:
 index.cjs   index.d.ts   index.js   LICENSE.md   package.json   README.md

./node_modules/combined-stream:
 lib   License   package.json   Readme.md   yarn.lock

./node_modules/combined-stream/lib:
 combined_stream.js

./node_modules/commander:
 typings   CHANGELOG.md   index.js   LICENSE   package.json   Readme.md

./node_modules/commander/typings:
 index.d.ts

./node_modules/common-path-prefix:
 index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/compare-version:
 index.js   package.json   README.md

./node_modules/compressible:
 node_modules   HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/compressible/node_modules:
 mime-db

./node_modules/compressible/node_modules/mime-db:
 db.json   HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/compression:
 node_modules   HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/compression/node_modules:
 debug   ms

./node_modules/compression/node_modules/debug:
 src            component.json   LICENSE    node.js        README.md
 CHANGELOG.md   karma.conf.js    Makefile   package.json  

./node_modules/compression/node_modules/debug/src:
 browser.js   debug.js   index.js   inspector-log.js   node.js

./node_modules/compression/node_modules/ms:
 index.js   license.md   package.json   readme.md

./node_modules/concat-map:
 example   test   index.js   LICENSE   package.json   README.markdown

./node_modules/concat-map/example:
 map.js

./node_modules/concat-map/test:
 map.js

./node_modules/concurrently:
 dist   index.d.mts   index.js    LICENSE        README.md
 docs   index.d.ts    index.mjs   package.json  

./node_modules/concurrently/dist:
 bin   src

./node_modules/concurrently/dist/bin:
 concurrently.d.ts   concurrently.js   read-package.d.ts   read-package.js

./node_modules/concurrently/dist/src:
 command-parser             date-format.d.ts   logger.d.ts
 flow-control               date-format.js     logger.js
 command.d.ts               defaults.d.ts      output-writer.d.ts
 command.js                 defaults.js        output-writer.js
 completion-listener.d.ts   index.d.ts         prefix-color-selector.d.ts
 completion-listener.js     index.js           prefix-color-selector.js
 concurrently.d.ts          jsonc.d.ts         spawn.d.ts
 concurrently.js            jsonc.js           spawn.js

./node_modules/concurrently/dist/src/command-parser:
 command-parser.d.ts     expand-shortcut.d.ts   strip-quotes.d.ts
 command-parser.js       expand-shortcut.js     strip-quotes.js
 expand-arguments.d.ts   expand-wildcard.d.ts  
 expand-arguments.js     expand-wildcard.js    

./node_modules/concurrently/dist/src/flow-control:
 flow-controller.d.ts   kill-others.js    log-timings.d.ts       teardown.js
 flow-controller.js     log-error.d.ts    log-timings.js        
 input-handler.d.ts     log-error.js      logger-padding.d.ts   
 input-handler.js       log-exit.d.ts     logger-padding.js     
 kill-on-signal.d.ts    log-exit.js       restart-process.d.ts  
 kill-on-signal.js      log-output.d.ts   restart-process.js    
 kill-others.d.ts       log-output.js     teardown.d.ts         

./node_modules/concurrently/docs:
 cli   demo.gif   README.md

./node_modules/concurrently/docs/cli:
 configuration.md    output-control.md          prefixing.md    shortcuts.md
 input-handling.md   passthrough-arguments.md   restarting.md  

./node_modules/config-file-ts:
 dist   src   LICENSE   package.json   README.md

./node_modules/config-file-ts/dist:
 compileUtil.d.ts   index.js       loadTsConfig.d.ts
 index.d.ts         index.js.map   tsCompile.d.ts

./node_modules/config-file-ts/src:
 compileUtil.ts   index.ts   loadTsConfig.ts   tsCompile.ts

./node_modules/connect-history-api-fallback:
 lib   LICENSE   package.json   README.md

./node_modules/connect-history-api-fallback/lib:
 index.js

./node_modules/console-control-strings:
 index.js   LICENSE   package.json   README.md   README.md~

./node_modules/content-disposition:
 HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/content-type:
 HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/convert-source-map:
 index.js   LICENSE   package.json   README.md

./node_modules/cookie:
 index.js   LICENSE   package.json   README.md   SECURITY.md

./node_modules/cookie-signature:
 History.md   index.js   package.json   Readme.md

./node_modules/core-js-compat:
 compat.d.ts                                index.js
 compat.js                                  LICENSE
 data.json                                  modules-by-versions.json
 entries.json                               modules.json
 external.json                              package.json
 get-modules-list-for-target-version.d.ts   README.md
 get-modules-list-for-target-version.js     shared.d.ts
 helpers.js                                 targets-parser.js
 index.d.ts                                

./node_modules/core-util-is:
 lib   float.patch   LICENSE   package.json   README.md   test.js

./node_modules/core-util-is/lib:
 util.js

./node_modules/crc:
 lib              crc16modbus.js   crc24.js           define_crc.js
 crc1.js          crc16xmodem.js   crc32.js           index.js
 crc8.js          crc17ccitt.js    crc81wire.js       LICENSE
 crc16.js         crc17kermit.js   crc91wire.js       package.json
 crc16ccitt.js    crc17modbus.js   crcjam.js          README.md
 crc16kermit.js   crc17xmodem.js   create_buffer.js  

./node_modules/crc/lib:
 es6             crc16.js          crc17_ccitt.js    crc32.js
 crc1.js         crc16_ccitt.js    crc17_kermit.js   crcjam.js
 crc8.js         crc16_kermit.js   crc17_modbus.js   index.js
 crc8_1wire.js   crc16_modbus.js   crc17_xmodem.js  
 crc9_1wire.js   crc16_xmodem.js   crc24.js         

./node_modules/crc/lib/es6:
 crc1.js          crc16modbus.js   crc17xmodem.js   crcjam.js
 crc8.js          crc16xmodem.js   crc24.js         create_buffer.js
 crc16.js         crc17ccitt.js    crc32.js         define_crc.js
 crc16ccitt.js    crc17kermit.js   crc81wire.js     index.js
 crc16kermit.js   crc17modbus.js   crc91wire.js    

./node_modules/cross-spawn:
 lib   index.js   LICENSE   package.json   README.md

./node_modules/cross-spawn/lib:
 util   enoent.js   parse.js

./node_modules/cross-spawn/lib/util:
 escape.js   readShebang.js   resolveCommand.js

./node_modules/debug:
 src   LICENSE   package.json   README.md

./node_modules/debug/src:
 browser.js   common.js   index.js   node.js

./node_modules/decompress-response:
 node_modules   index.d.ts   index.js   license   package.json   readme.md

./node_modules/decompress-response/node_modules:
 mimic-response

./node_modules/decompress-response/node_modules/mimic-response:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/default-browser:
 index.d.ts   index.js   license   package.json   readme.md   windows.js

./node_modules/default-browser-id:
 index.js   license   package.json   readme.md

./node_modules/defaults:
 index.js   LICENSE   package.json   README.md   test.js

./node_modules/defer-to-connect:
 dist   LICENSE   package.json   README.md

./node_modules/defer-to-connect/dist:
 source

./node_modules/defer-to-connect/dist/source:
 index.d.ts   index.js

./node_modules/define-data-property:
 test           index.d.ts   LICENSE        README.md
 CHANGELOG.md   index.js     package.json   tsconfig.json

./node_modules/define-data-property/test:
 index.js

./node_modules/define-lazy-prop:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/define-properties:
 CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/delayed-stream:
 lib   License   Makefile   package.json   Readme.md

./node_modules/delayed-stream/lib:
 delayed_stream.js

./node_modules/delegates:
 test         index.js   Makefile       Readme.md
 History.md   License    package.json  

./node_modules/delegates/test:
 index.js

./node_modules/depd:
 lib   History.md   index.js   LICENSE   package.json   Readme.md

./node_modules/depd/lib:
 browser

./node_modules/depd/lib/browser:
 index.js

./node_modules/destroy:
 index.js   LICENSE   package.json   README.md

./node_modules/detect-libc:
 lib   index.d.ts   LICENSE   package.json   README.md

./node_modules/detect-libc/lib:
 detect-libc.js   filesystem.js   process.js

./node_modules/detect-node:
 browser.js   index.esm.js   index.js   LICENSE   package.json   Readme.md

./node_modules/dir-compare:
 build   LICENSE   package.json   README.md

./node_modules/dir-compare/build:
 src

./node_modules/dir-compare/build/src:
 Entry                compareAsync.d.ts.map   ExtOptions.js.map
 FileCompareHandler   compareAsync.js         index.d.ts
 FileSystem           compareAsync.js.map     index.d.ts.map
 FilterHandler        compareSync.d.ts        index.js
 NameCompare          compareSync.d.ts.map    index.js.map
 Permission           compareSync.js          types.d.ts
 ResultBuilder        compareSync.js.map      types.d.ts.map
 Statistics           ExtOptions.d.ts         types.js
 Symlink              ExtOptions.d.ts.map     types.js.map
 compareAsync.d.ts    ExtOptions.js          

./node_modules/dir-compare/build/src/Entry:
 EntryBuilder.d.ts          EntryComparator.js       EntryType.d.ts
 EntryBuilder.d.ts.map      EntryComparator.js.map   EntryType.d.ts.map
 EntryBuilder.js            EntryEquality.d.ts       EntryType.js
 EntryBuilder.js.map        EntryEquality.d.ts.map   EntryType.js.map
 EntryComparator.d.ts       EntryEquality.js        
 EntryComparator.d.ts.map   EntryEquality.js.map    

./node_modules/dir-compare/build/src/FileCompareHandler:
 default   lines

./node_modules/dir-compare/build/src/FileCompareHandler/default:
 defaultFileCompare.d.ts       defaultFileCompare.js
 defaultFileCompare.d.ts.map   defaultFileCompare.js.map

./node_modules/dir-compare/build/src/FileCompareHandler/lines:
 compare                            LineBasedCompareContext.js.map
 lineReader                         lineBasedCompareSync.d.ts
 lineBasedCompareAsync.d.ts         lineBasedCompareSync.d.ts.map
 lineBasedCompareAsync.d.ts.map     lineBasedCompareSync.js
 lineBasedCompareAsync.js           lineBasedCompareSync.js.map
 lineBasedCompareAsync.js.map       lineBasedFileCompare.d.ts
 LineBasedCompareContext.d.ts       lineBasedFileCompare.d.ts.map
 LineBasedCompareContext.d.ts.map   lineBasedFileCompare.js
 LineBasedCompareContext.js         lineBasedFileCompare.js.map

./node_modules/dir-compare/build/src/FileCompareHandler/lines/compare:
 compareLineBatches.d.ts       compareLines.js
 compareLineBatches.d.ts.map   compareLines.js.map
 compareLineBatches.js         CompareLinesResult.d.ts
 compareLineBatches.js.map     CompareLinesResult.d.ts.map
 compareLines.d.ts             CompareLinesResult.js
 compareLines.d.ts.map         CompareLinesResult.js.map

./node_modules/dir-compare/build/src/FileCompareHandler/lines/lineReader:
 LineBatch.d.ts       LineBatch.js.map             readBufferedLines.js
 LineBatch.d.ts.map   readBufferedLines.d.ts       readBufferedLines.js.map
 LineBatch.js         readBufferedLines.d.ts.map  

./node_modules/dir-compare/build/src/FileSystem:
 BufferPool.d.ts       FileCloser.js.map              FsPromise.js
 BufferPool.d.ts.map   FileDescriptorQueue.d.ts       FsPromise.js.map
 BufferPool.js         FileDescriptorQueue.d.ts.map   Queue.d.ts
 BufferPool.js.map     FileDescriptorQueue.js         Queue.d.ts.map
 FileCloser.d.ts       FileDescriptorQueue.js.map     Queue.js
 FileCloser.d.ts.map   FsPromise.d.ts                 Queue.js.map
 FileCloser.js         FsPromise.d.ts.map            

./node_modules/dir-compare/build/src/FilterHandler:
 defaultFilterHandler.d.ts       defaultFilterHandler.js
 defaultFilterHandler.d.ts.map   defaultFilterHandler.js.map

./node_modules/dir-compare/build/src/NameCompare:
 defaultNameCompare.d.ts         fileBasedNameCompare.js
 defaultNameCompare.d.ts.map     fileBasedNameCompare.js.map
 defaultNameCompare.js           StringCompareResult.d.ts
 defaultNameCompare.js.map       StringCompareResult.d.ts.map
 fileBasedNameCompare.d.ts       StringCompareResult.js
 fileBasedNameCompare.d.ts.map   StringCompareResult.js.map

./node_modules/dir-compare/build/src/Permission:
 Permission.d.ts   Permission.d.ts.map   Permission.js   Permission.js.map

./node_modules/dir-compare/build/src/ResultBuilder:
 defaultResultBuilderCallback.d.ts       defaultResultBuilderCallback.js
 defaultResultBuilderCallback.d.ts.map   defaultResultBuilderCallback.js.map

./node_modules/dir-compare/build/src/Statistics:
 StatisticsLifecycle.d.ts       StatisticsUpdate.d.ts
 StatisticsLifecycle.d.ts.map   StatisticsUpdate.d.ts.map
 StatisticsLifecycle.js         StatisticsUpdate.js
 StatisticsLifecycle.js.map     StatisticsUpdate.js.map

./node_modules/dir-compare/build/src/Symlink:
 LoopDetector.d.ts       LoopDetector.js
 LoopDetector.d.ts.map   LoopDetector.js.map

./node_modules/dmg-builder:
 out   templates   vendor   package.json   readme.md

./node_modules/dmg-builder/out:
 dmg.d.ts            hdiuil.d.ts
 dmg.js              hdiuil.js
 dmg.js.map          hdiuil.js.map
 dmgLicense.d.ts     licenseButtons.d.ts
 dmgLicense.js       licenseButtons.js
 dmgLicense.js.map   licenseButtons.js.map
 dmgUtil.d.ts        licenseDefaultButtons.d.ts
 dmgUtil.js          licenseDefaultButtons.js
 dmgUtil.js.map      licenseDefaultButtons.js.map

./node_modules/dmg-builder/templates:
 background.tiff

./node_modules/dmg-builder/vendor:
 biplist   dmgbuild   ds_store   mac_alias

./node_modules/dmg-builder/vendor/biplist:
 __init__.py

./node_modules/dmg-builder/vendor/dmgbuild:
 badge.py   colors.py   core.py

./node_modules/dmg-builder/vendor/ds_store:
 __init__.py   buddy.py   store.py

./node_modules/dmg-builder/vendor/mac_alias:
 __init__.py   alias.py   bookmark.py   osx.py   utils.py

./node_modules/dmg-license:
 bin   language-info.json   package.json   schema.json
 lib   LICENSE              README.md     

./node_modules/dmg-license/bin:
 dmg-license.js

./node_modules/dmg-license/lib:
 util                    Context.d.ts    Language.js
 assembleLicenses.d.ts   Context.js      makeLicensePlist.d.ts
 assembleLicenses.js     index.d.ts      makeLicensePlist.js
 BodySpec.d.ts           index.js        specFromJSON.d.ts
 BodySpec.js             Labels.d.ts     specFromJSON.js
 cli.d.ts                Labels.js       writePlistToDmg.d.ts
 cli.js                  Language.d.ts   writePlistToDmg.js

./node_modules/dmg-license/lib/util:
 buffer-split.d.ts   errors.js            index.d.ts         PromiseEach.js
 buffer-split.js     format-verror.d.ts   index.js          
 errors.d.ts         format-verror.js     PromiseEach.d.ts  

./node_modules/dns-packet:
 classes.js   LICENSE      optioncodes.js   rcodes.js   types.js
 index.js     opcodes.js   package.json     README.md  

./node_modules/dotenv:
 lib            config.d.ts   LICENSE        README-es.md
 CHANGELOG.md   config.js     package.json   README.md

./node_modules/dotenv/lib:
 cli-options.js   env-options.js   main.d.ts   main.js

./node_modules/dotenv-expand:
 lib            config.d.ts   LICENSE        README.md
 CHANGELOG.md   config.js     package.json   tea.yaml

./node_modules/dotenv-expand/lib:
 main.d.ts   main.js

./node_modules/dunder-proto:
 test           get.d.ts   LICENSE        README.md   set.js
 CHANGELOG.md   get.js     package.json   set.d.ts    tsconfig.json

./node_modules/dunder-proto/test:
 get.js   index.js   set.js

./node_modules/eastasianwidth:
 eastasianwidth.js   package.json   README.md

./node_modules/ee-first:
 index.js   LICENSE   package.json   README.md

./node_modules/ejs:
 bin   ejs.js       jakefile.js   package.json   usage.txt
 lib   ejs.min.js   LICENSE       README.md     

./node_modules/ejs/bin:
 cli.js

./node_modules/ejs/lib:
 ejs.js   utils.js

./node_modules/electron:
 dist             cli.js          install.js     path.txt
 node_modules     electron.d.ts   LICENSE        README.md
 checksums.json   index.js        package.json  

./node_modules/electron/dist:
 Electron.app   LICENSE   LICENSES.chromium.html   version

./node_modules/electron/dist/Electron.app:
 Contents

./node_modules/electron/dist/Electron.app/Contents:
 Frameworks   MacOS   Resources   Info.plist   PkgInfo

./node_modules/electron/dist/Electron.app/Contents/Frameworks:
 'Electron Framework.framework'     'Electron Helper.app'
 'Electron Helper (GPU).app'        Mantle.framework
 'Electron Helper (Plugin).app'     ReactiveObjC.framework
 'Electron Helper (Renderer).app'   Squirrel.framework

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework':
 Helpers   Libraries   Resources   Versions   'Electron Framework'

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions':
 A   Current

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A':
 Helpers   Libraries   Resources   'Electron Framework'

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers':
 chrome_crashpad_handler

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries':
 libEGL.dylib      libGLESv2.dylib           vk_swiftshader_icd.json
 libffmpeg.dylib   libvk_swiftshader.dylib  

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources':
 af.lproj       hi.lproj      sl.lproj
 am.lproj       hr.lproj      sr.lproj
 ar.lproj       hu.lproj      sv.lproj
 bg.lproj       id.lproj      sw.lproj
 bn.lproj       it.lproj      ta.lproj
 ca.lproj       ja.lproj      te.lproj
 cs.lproj       kn.lproj      th.lproj
 da.lproj       ko.lproj      tr.lproj
 de.lproj       lt.lproj      uk.lproj
 el.lproj       lv.lproj      ur.lproj
 en.lproj       ml.lproj      vi.lproj
 en_GB.lproj    mr.lproj      zh_CN.lproj
 es.lproj       ms.lproj      zh_TW.lproj
 es_419.lproj   nb.lproj      chrome_100_percent.pak
 et.lproj       nl.lproj      chrome_200_percent.pak
 fa.lproj       pl.lproj      icudtl.dat
 fi.lproj       pt_BR.lproj   Info.plist
 fil.lproj      pt_PT.lproj   MainMenu.nib
 fr.lproj       ro.lproj      resources.pak
 gu.lproj       ru.lproj      v8_context_snapshot.x86_64.bin
 he.lproj       sk.lproj     

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/af.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/am.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ar.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/bg.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/bn.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ca.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/cs.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/da.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/de.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/el.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/en.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/en_GB.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/es.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/es_419.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/et.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/fa.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/fi.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/fil.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/fr.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/gu.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/he.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/hi.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/hr.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/hu.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/id.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/it.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ja.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/kn.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ko.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/lt.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/lv.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ml.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/mr.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ms.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/nb.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/nl.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/pl.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/pt_BR.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/pt_PT.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ro.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ru.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/sk.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/sl.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/sr.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/sv.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/sw.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ta.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/te.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/th.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/tr.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/uk.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/ur.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/vi.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/zh_CN.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/zh_TW.lproj':
 locale.pak

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (GPU).app':
 Contents

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (GPU).app/Contents':
 MacOS   Info.plist   PkgInfo

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (GPU).app/Contents/MacOS':
 'Electron Helper (GPU)'

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (Plugin).app':
 Contents

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (Plugin).app/Contents':
 MacOS   Info.plist   PkgInfo

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (Plugin).app/Contents/MacOS':
 'Electron Helper (Plugin)'

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (Renderer).app':
 Contents

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (Renderer).app/Contents':
 MacOS   Info.plist   PkgInfo

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper (Renderer).app/Contents/MacOS':
 'Electron Helper (Renderer)'

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper.app':
 Contents

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper.app/Contents':
 MacOS   Info.plist   PkgInfo

'./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper.app/Contents/MacOS':
 'Electron Helper'

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Mantle.framework:
 Resources   Versions   Mantle

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Mantle.framework/Versions:
 A   Current

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Mantle.framework/Versions/A:
 Resources   Mantle

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Mantle.framework/Versions/A/Resources:
 Info.plist

./node_modules/electron/dist/Electron.app/Contents/Frameworks/ReactiveObjC.framework:
 Resources   Versions   ReactiveObjC

./node_modules/electron/dist/Electron.app/Contents/Frameworks/ReactiveObjC.framework/Versions:
 A   Current

./node_modules/electron/dist/Electron.app/Contents/Frameworks/ReactiveObjC.framework/Versions/A:
 Resources   ReactiveObjC

./node_modules/electron/dist/Electron.app/Contents/Frameworks/ReactiveObjC.framework/Versions/A/Resources:
 Info.plist

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Squirrel.framework:
 Resources   Versions   Squirrel

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Squirrel.framework/Versions:
 A   Current

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Squirrel.framework/Versions/A:
 Resources   Squirrel

./node_modules/electron/dist/Electron.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources:
 Info.plist   ShipIt

./node_modules/electron/dist/Electron.app/Contents/MacOS:
 Electron

./node_modules/electron/dist/Electron.app/Contents/Resources:
 af.lproj      es.lproj       id.lproj   pl.lproj      th.lproj
 am.lproj      es_419.lproj   it.lproj   pt_BR.lproj   tr.lproj
 ar.lproj      et.lproj       ja.lproj   pt_PT.lproj   uk.lproj
 bg.lproj      fa.lproj       kn.lproj   ro.lproj      ur.lproj
 bn.lproj      fi.lproj       ko.lproj   ru.lproj      vi.lproj
 ca.lproj      fil.lproj      lt.lproj   sk.lproj      zh_CN.lproj
 cs.lproj      fr.lproj       lv.lproj   sl.lproj      zh_TW.lproj
 da.lproj      gu.lproj       ml.lproj   sr.lproj      default_app.asar
 de.lproj      he.lproj       mr.lproj   sv.lproj      electron.icns
 el.lproj      hi.lproj       ms.lproj   sw.lproj     
 en.lproj      hr.lproj       nb.lproj   ta.lproj     
 en_GB.lproj   hu.lproj       nl.lproj   te.lproj     

./node_modules/electron/dist/Electron.app/Contents/Resources/af.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/am.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ar.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/bg.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/bn.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ca.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/cs.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/da.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/de.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/el.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/en.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/en_GB.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/es.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/es_419.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/et.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/fa.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/fi.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/fil.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/fr.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/gu.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/he.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/hi.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/hr.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/hu.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/id.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/it.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ja.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/kn.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ko.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/lt.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/lv.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ml.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/mr.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ms.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/nb.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/nl.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/pl.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/pt_BR.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/pt_PT.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ro.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ru.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/sk.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/sl.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/sr.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/sv.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/sw.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ta.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/te.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/th.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/tr.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/uk.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/ur.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/vi.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/zh_CN.lproj:

./node_modules/electron/dist/Electron.app/Contents/Resources/zh_TW.lproj:

./node_modules/electron/node_modules:
 @types   undici-types

./node_modules/electron/node_modules/@types:
 node

./node_modules/electron/node_modules/@types/node:
 assert                     dom-events.d.ts           querystring.d.ts
 compatibility              domain.d.ts               readline.d.ts
 dns                        events.d.ts               README.md
 fs                         fs.d.ts                   repl.d.ts
 readline                   globals.d.ts              sea.d.ts
 stream                     globals.typedarray.d.ts   stream.d.ts
 timers                     http.d.ts                 string_decoder.d.ts
 ts5.6                      http2.d.ts                test.d.ts
 assert.d.ts                https.d.ts                timers.d.ts
 async_hooks.d.ts           index.d.ts                tls.d.ts
 buffer.buffer.d.ts         inspector.d.ts            trace_events.d.ts
 buffer.d.ts                LICENSE                   tty.d.ts
 child_process.d.ts         module.d.ts               url.d.ts
 cluster.d.ts               net.d.ts                  util.d.ts
 console.d.ts               os.d.ts                   v8.d.ts
 constants.d.ts             package.json              vm.d.ts
 crypto.d.ts                path.d.ts                 wasi.d.ts
 dgram.d.ts                 perf_hooks.d.ts           worker_threads.d.ts
 diagnostics_channel.d.ts   process.d.ts              zlib.d.ts
 dns.d.ts                   punycode.d.ts            

./node_modules/electron/node_modules/@types/node/assert:
 strict.d.ts

./node_modules/electron/node_modules/@types/node/compatibility:
 disposable.d.ts   index.d.ts   indexable.d.ts   iterators.d.ts

./node_modules/electron/node_modules/@types/node/dns:
 promises.d.ts

./node_modules/electron/node_modules/@types/node/fs:
 promises.d.ts

./node_modules/electron/node_modules/@types/node/readline:
 promises.d.ts

./node_modules/electron/node_modules/@types/node/stream:
 consumers.d.ts   promises.d.ts   web.d.ts

./node_modules/electron/node_modules/@types/node/timers:
 promises.d.ts

./node_modules/electron/node_modules/@types/node/ts5.6:
 buffer.buffer.d.ts   globals.typedarray.d.ts   index.d.ts

./node_modules/electron/node_modules/undici-types:
 agent.d.ts                  file.d.ts                mock-pool.d.ts
 api.d.ts                    filereader.d.ts          package.json
 balanced-pool.d.ts          formdata.d.ts            patch.d.ts
 cache.d.ts                  global-dispatcher.d.ts   pool-stats.d.ts
 client.d.ts                 global-origin.d.ts       pool.d.ts
 connector.d.ts              handlers.d.ts            proxy-agent.d.ts
 content-type.d.ts           header.d.ts              readable.d.ts
 cookies.d.ts                index.d.ts               README.md
 diagnostics-channel.d.ts    interceptors.d.ts        retry-agent.d.ts
 dispatcher.d.ts             LICENSE                  retry-handler.d.ts
 env-http-proxy-agent.d.ts   mock-agent.d.ts          util.d.ts
 errors.d.ts                 mock-client.d.ts         webidl.d.ts
 eventsource.d.ts            mock-errors.d.ts         websocket.d.ts
 fetch.d.ts                  mock-interceptor.d.ts   

./node_modules/electron-builder:
 out   cli.js   install-app-deps.js   LICENSE   package.json

./node_modules/electron-builder/out:
 cli            builder.js       index.d.ts   index.js.map   publish.js
 builder.d.ts   builder.js.map   index.js     publish.d.ts   publish.js.map

./node_modules/electron-builder/out/cli:
 cli.d.ts                       create-self-signed-cert.js.map   start.js
 cli.js                         install-app-deps.d.ts            start.js.map
 cli.js.map                     install-app-deps.js             
 create-self-signed-cert.d.ts   install-app-deps.js.map         
 create-self-signed-cert.js     start.d.ts                      

./node_modules/electron-publish:
 out   LICENSE   package.json   readme.md

./node_modules/electron-publish/out:
 gitHubPublisher.d.ts     multiProgress.js       progress.js.map
 gitHubPublisher.js       multiProgress.js.map   publisher.d.ts
 gitHubPublisher.js.map   progress.d.ts          publisher.js
 multiProgress.d.ts       progress.js            publisher.js.map

./node_modules/electron-to-chromium:
 chromium-versions.js          full-versions.js     package.json
 chromium-versions.json        full-versions.json   README.md
 full-chromium-versions.js     index.js             versions.js
 full-chromium-versions.json   LICENSE              versions.json

./node_modules/emoji-regex:
 es2015       index.js          package.json   text.js
 index.d.ts   LICENSE-MIT.txt   README.md     

./node_modules/emoji-regex/es2015:
 index.js   text.js

./node_modules/encodeurl:
 index.js   LICENSE   package.json   README.md

./node_modules/encoding:
 lib   test   LICENSE   package.json   README.md

./node_modules/encoding/lib:
 encoding.js

./node_modules/encoding/test:
 test.js

./node_modules/end-of-stream:
 index.js   LICENSE   package.json   README.md

./node_modules/enhanced-resolve:
 lib   LICENSE   package.json   README.md   types.d.ts

./node_modules/enhanced-resolve/lib:
 util                                        ModulesInRootPlugin.js
 AliasFieldPlugin.js                         NextPlugin.js
 AliasPlugin.js                              ParsePlugin.js
 AppendPlugin.js                             PnpPlugin.js
 CachedInputFileSystem.js                    Resolver.js
 CloneBasenamePlugin.js                      ResolverFactory.js
 ConditionalPlugin.js                        RestrictionsPlugin.js
 createInnerContext.js                       ResultPlugin.js
 DescriptionFilePlugin.js                    RootsPlugin.js
 DescriptionFileUtils.js                     SelfReferencePlugin.js
 DirectoryExistsPlugin.js                    SymlinkPlugin.js
 ExportsFieldPlugin.js                       SyncAsyncFileSystemDecorator.js
 ExtensionAliasPlugin.js                     TryNextPlugin.js
 FileExistsPlugin.js                         UnsafeCachePlugin.js
 forEachBail.js                              UseFilePlugin.js
 getInnerRequest.js                         
 getPaths.js                                
 ImportsFieldPlugin.js                      
 index.js                                   
 JoinRequestPartPlugin.js                   
 JoinRequestPlugin.js                       
 LogInfoPlugin.js                           
 MainFieldPlugin.js                         
 ModulesInHierachicDirectoriesPlugin.js     
 ModulesInHierarchicalDirectoriesPlugin.js  

./node_modules/enhanced-resolve/lib/util:
 entrypoints.js   module-browser.js   process-browser.js
 identifier.js    path.js            

./node_modules/env-paths:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/envinfo:
 dist   LICENSE   package.json   README.md

./node_modules/envinfo/dist:
 cli.js   envinfo.js

./node_modules/err-code:
 test   bower.json   index.js   index.umd.js   package.json   README.md

./node_modules/err-code/test:
 test.js

./node_modules/es-define-property:
 test           index.d.ts   LICENSE        README.md
 CHANGELOG.md   index.js     package.json   tsconfig.json

./node_modules/es-define-property/test:
 index.js

./node_modules/es-errors:
 test           index.d.ts     range.d.ts   ref.js          type.d.ts
 CHANGELOG.md   index.js       range.js     syntax.d.ts     type.js
 eval.d.ts      LICENSE        README.md    syntax.js       uri.d.ts
 eval.js        package.json   ref.d.ts     tsconfig.json   uri.js

./node_modules/es-errors/test:
 index.js

./node_modules/es-module-lexer:
 dist   types   lexer.js   LICENSE   package.json   README.md

./node_modules/es-module-lexer/dist:
 lexer.asm.js   lexer.cjs   lexer.js

./node_modules/es-module-lexer/types:
 lexer.d.ts

./node_modules/es-object-atoms:
 test           index.js       README.md                     ToObject.d.ts
 CHANGELOG.md   LICENSE        RequireObjectCoercible.d.ts   ToObject.js
 index.d.ts     package.json   RequireObjectCoercible.js     tsconfig.json

./node_modules/es-object-atoms/test:
 index.js

./node_modules/es6-error:
 es6   typings        LICENSE.md     README.md
 lib   CHANGELOG.md   package.json  

./node_modules/es6-error/es6:
 index.js

./node_modules/es6-error/lib:
 index.js

./node_modules/es6-error/typings:
 index.d.ts

./node_modules/escalade:
 dist   index.d.mts   license        readme.md
 sync   index.d.ts    package.json  

./node_modules/escalade/dist:
 index.js   index.mjs

./node_modules/escalade/sync:
 index.d.mts   index.d.ts   index.js   index.mjs

./node_modules/escape-html:
 index.js   LICENSE   package.json   Readme.md

./node_modules/escape-string-regexp:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/eslint-scope:
 lib   node_modules   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/eslint-scope/lib:
 definition.js   pattern-visitor.js   referencer.js      scope.js
 index.js        reference.js         scope-manager.js   variable.js

./node_modules/eslint-scope/node_modules:
 estraverse

./node_modules/eslint-scope/node_modules/estraverse:
 estraverse.js   gulpfile.js   LICENSE.BSD   package.json   README.md

./node_modules/esrecurse:
 esrecurse.js   gulpfile.babel.js   package.json   README.md

./node_modules/estraverse:
 estraverse.js   gulpfile.js   LICENSE.BSD   package.json   README.md

./node_modules/esutils:
 lib   LICENSE.BSD   package.json   README.md

./node_modules/esutils/lib:
 ast.js   code.js   keyword.js   utils.js

./node_modules/etag:
 HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/eventemitter3:
 umd   index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/eventemitter3/umd:
 eventemitter3.js   eventemitter3.min.js   eventemitter3.min.js.map

./node_modules/events:
 tests       History.md   package.json   security.md
 events.js   LICENSE      Readme.md     

./node_modules/events/tests:
 add-listeners.js            max-listeners.js                    symbols.js
 check-listener-leaks.js     method-names.js                    
 common.js                   modify-in-emit.js                  
 errors.js                   num-args.js                        
 events-list.js              once.js                            
 events-once.js              prepend.js                         
 index.js                    remove-all-listeners.js            
 legacy-compat.js            remove-listeners.js                
 listener-count.js           set-max-listeners-side-effects.js  
 listeners-side-effects.js   special-event-names.js             
 listeners.js                subclass.js                        

./node_modules/exponential-backoff:
 dist   LICENSE   package.json   README.md

./node_modules/exponential-backoff/dist:
 delay    backoff.d.ts   backoff.js.map   options.js
 jitter   backoff.js     options.d.ts     options.js.map

./node_modules/exponential-backoff/dist/delay:
 always            delay.base.js.map      delay.interface.d.ts
 skip-first        delay.factory.d.ts     delay.interface.js
 delay.base.d.ts   delay.factory.js       delay.interface.js.map
 delay.base.js     delay.factory.js.map  

./node_modules/exponential-backoff/dist/delay/always:
 always.delay.d.ts   always.delay.js   always.delay.js.map

./node_modules/exponential-backoff/dist/delay/skip-first:
 skip-first.delay.d.ts   skip-first.delay.js   skip-first.delay.js.map

./node_modules/exponential-backoff/dist/jitter:
 full   jitter.factory.d.ts   jitter.factory.js.map
 no     jitter.factory.js    

./node_modules/exponential-backoff/dist/jitter/full:
 full.jitter.d.ts   full.jitter.js   full.jitter.js.map

./node_modules/exponential-backoff/dist/jitter/no:
 no.jitter.d.ts   no.jitter.js   no.jitter.js.map

./node_modules/express:
 lib            History.md   LICENSE        Readme.md
 node_modules   index.js     package.json  

./node_modules/express/lib:
 middleware   application.js   request.js    utils.js
 router       express.js       response.js   view.js

./node_modules/express/lib/middleware:
 init.js   query.js

./node_modules/express/lib/router:
 index.js   layer.js   route.js

./node_modules/express/node_modules:
 debug   ms

./node_modules/express/node_modules/debug:
 src            component.json   LICENSE    node.js        README.md
 CHANGELOG.md   karma.conf.js    Makefile   package.json  

./node_modules/express/node_modules/debug/src:
 browser.js   debug.js   index.js   inspector-log.js   node.js

./node_modules/express/node_modules/ms:
 index.js   license.md   package.json   readme.md

./node_modules/extract-zip:
 cli.js   index.d.ts   index.js   LICENSE   package.json   readme.md

./node_modules/extsprintf:
 lib    CHANGES.md        jsl.node.conf   Makefile        package.json
 test   CONTRIBUTING.md   LICENSE         Makefile.targ   README.md

./node_modules/extsprintf/lib:
 extsprintf.js

./node_modules/extsprintf/test:
 tst.basic.js   tst.invalid.js

./node_modules/fast-deep-equal:
 es6          index.js   package.json   react.js
 index.d.ts   LICENSE    react.d.ts     README.md

./node_modules/fast-deep-equal/es6:
 index.d.ts   index.js   react.d.ts   react.js

./node_modules/fast-json-stable-stringify:
 benchmark   test         index.js   package.json
 example     index.d.ts   LICENSE    README.md

./node_modules/fast-json-stable-stringify/benchmark:
 index.js   test.json

./node_modules/fast-json-stable-stringify/example:
 key_cmp.js   nested.js   str.js   value_cmp.js

./node_modules/fast-json-stable-stringify/test:
 cmp.js   nested.js   str.js   to-json.js

./node_modules/fast-uri:
 lib    types          index.js   package.json
 test   benchmark.js   LICENSE    README.md

./node_modules/fast-uri/lib:
 schemes.js   scopedChars.js   utils.js

./node_modules/fast-uri/test:
 ajv.test.js             equal.test.js   resolve.test.js     uri-js.test.js
 compatibility.test.js   parse.test.js   serialize.test.js   util.test.js

./node_modules/fast-uri/types:
 index.d.ts   index.test-d.ts

./node_modules/fastest-levenshtein:
 esm        LICENSE.md   mod.js         README.md   test.ts
 bench.js   mod.d.ts     package.json   test.js    

./node_modules/fastest-levenshtein/esm:
 mod.d.ts   mod.d.ts.map   mod.js

./node_modules/faye-websocket:
 lib   CHANGELOG.md   LICENSE.md   package.json   README.md

./node_modules/faye-websocket/lib:
 faye

./node_modules/faye-websocket/lib/faye:
 websocket   eventsource.js   websocket.js

./node_modules/faye-websocket/lib/faye/websocket:
 api   api.js   client.js

./node_modules/faye-websocket/lib/faye/websocket/api:
 event.js   event_target.js

./node_modules/fd-slicer:
 test   CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/fd-slicer/test:
 test.js

./node_modules/filelist:
 node_modules   index.js      package.json
 index.d.ts     jakefile.js   README.md

./node_modules/filelist/node_modules:
 minimatch

./node_modules/filelist/node_modules/minimatch:
 lib   LICENSE   minimatch.js   package.json   README.md

./node_modules/filelist/node_modules/minimatch/lib:
 path.js

./node_modules/fill-range:
 index.js   LICENSE   package.json   README.md

./node_modules/finalhandler:
 node_modules   index.js   package.json   SECURITY.md
 HISTORY.md     LICENSE    README.md     

./node_modules/finalhandler/node_modules:
 debug   ms

./node_modules/finalhandler/node_modules/debug:
 src            component.json   LICENSE    node.js        README.md
 CHANGELOG.md   karma.conf.js    Makefile   package.json  

./node_modules/finalhandler/node_modules/debug/src:
 browser.js   debug.js   index.js   inspector-log.js   node.js

./node_modules/finalhandler/node_modules/ms:
 index.js   license.md   package.json   readme.md

./node_modules/find-cache-dir:
 index.js   license   package.json   readme.md

./node_modules/find-up:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/flat:
 test   cli.js   index.js   LICENSE   package.json   README.md

./node_modules/flat/test:
 test.js

./node_modules/follow-redirects:
 debug.js   https.js   LICENSE        README.md
 http.js    index.js   package.json  

./node_modules/foreground-child:
 dist   node_modules   LICENSE   package.json   README.md

./node_modules/foreground-child/dist:
 commonjs   esm

./node_modules/foreground-child/dist/commonjs:
 all-signals.d.ts       index.js                 proxy-signals.js.map
 all-signals.d.ts.map   index.js.map             watchdog.d.ts
 all-signals.js         package.json             watchdog.d.ts.map
 all-signals.js.map     proxy-signals.d.ts       watchdog.js
 index.d.ts             proxy-signals.d.ts.map   watchdog.js.map
 index.d.ts.map         proxy-signals.js        

./node_modules/foreground-child/dist/esm:
 all-signals.d.ts       index.js                 proxy-signals.js.map
 all-signals.d.ts.map   index.js.map             watchdog.d.ts
 all-signals.js         package.json             watchdog.d.ts.map
 all-signals.js.map     proxy-signals.d.ts       watchdog.js
 index.d.ts             proxy-signals.d.ts.map   watchdog.js.map
 index.d.ts.map         proxy-signals.js        

./node_modules/foreground-child/node_modules:
 signal-exit

./node_modules/foreground-child/node_modules/signal-exit:
 dist   LICENSE.txt   package.json   README.md

./node_modules/foreground-child/node_modules/signal-exit/dist:
 cjs   mjs

./node_modules/foreground-child/node_modules/signal-exit/dist/cjs:
 browser.d.ts       index.d.ts       package.json       signals.js.map
 browser.d.ts.map   index.d.ts.map   signals.d.ts      
 browser.js         index.js         signals.d.ts.map  
 browser.js.map     index.js.map     signals.js        

./node_modules/foreground-child/node_modules/signal-exit/dist/mjs:
 browser.d.ts       index.d.ts       package.json       signals.js.map
 browser.d.ts.map   index.d.ts.map   signals.d.ts      
 browser.js         index.js         signals.d.ts.map  
 browser.js.map     index.js.map     signals.js        

./node_modules/form-data:
 lib   index.d.ts   License   package.json   Readme.md

./node_modules/form-data/lib:
 browser.js   form_data.js   populate.js

./node_modules/forwarded:
 HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/fresh:
 HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/fs-extra:
 lib   LICENSE   package.json   README.md

./node_modules/fs-extra/lib:
 copy    ensure   json     move          path-exists   util
 empty   fs       mkdirs   output-file   remove        index.js

./node_modules/fs-extra/lib/copy:
 copy-sync.js   copy.js   index.js

./node_modules/fs-extra/lib/empty:
 index.js

./node_modules/fs-extra/lib/ensure:
 file.js    link.js            symlink-type.js
 index.js   symlink-paths.js   symlink.js

./node_modules/fs-extra/lib/fs:
 index.js

./node_modules/fs-extra/lib/json:
 index.js   jsonfile.js   output-json-sync.js   output-json.js

./node_modules/fs-extra/lib/mkdirs:
 index.js   make-dir.js   utils.js

./node_modules/fs-extra/lib/move:
 index.js   move-sync.js   move.js

./node_modules/fs-extra/lib/output-file:
 index.js

./node_modules/fs-extra/lib/path-exists:
 index.js

./node_modules/fs-extra/lib/remove:
 index.js   rimraf.js

./node_modules/fs-extra/lib/util:
 stat.js   utimes.js

./node_modules/fs-minipass:
 node_modules   index.js   LICENSE   package.json   README.md

./node_modules/fs-minipass/node_modules:
 minipass

./node_modules/fs-minipass/node_modules/minipass:
 index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/fs.realpath:
 index.js   LICENSE   old.js   package.json   README.md

./node_modules/fsevents:
 fsevents.d.ts   fsevents.node   package.json   vfs.js
 fsevents.js     LICENSE         README.md     

./node_modules/function-bind:
 test           implementation.js   LICENSE        README.md
 CHANGELOG.md   index.js            package.json  

./node_modules/function-bind/test:
 index.js

./node_modules/gauge:
 lib   LICENSE.md   package.json   README.md

./node_modules/gauge/lib:
 base-theme.js   plumbing.js          set-immediate.js   theme-set.js
 error.js        process.js           set-interval.js    themes.js
 has-color.js    progress-bar.js      spin.js            wide-truncate.js
 index.js        render-template.js   template-item.js  

./node_modules/gensync:
 test   index.js   index.js.flow   LICENSE   package.json   README.md

./node_modules/gensync/test:
 index.test.js

./node_modules/get-caller-file:
 index.d.ts   index.js.map   package.json
 index.js     LICENSE.md     README.md

./node_modules/get-intrinsic:
 test   CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/get-intrinsic/test:
 GetIntrinsic.js

./node_modules/get-stream:
 buffer-stream.js   index.js   package.json
 index.d.ts         license    readme.md

./node_modules/glob:
 dist   node_modules   LICENSE   package.json   README.md

./node_modules/glob/dist:
 commonjs   esm

./node_modules/glob/dist/commonjs:
 glob.d.ts            ignore.d.ts.map   pattern.d.ts.map     walker.js
 glob.d.ts.map        ignore.js         pattern.js           walker.js.map
 glob.js              ignore.js.map     pattern.js.map      
 glob.js.map          index.d.ts        processor.d.ts      
 has-magic.d.ts       index.d.ts.map    processor.d.ts.map  
 has-magic.d.ts.map   index.js          processor.js        
 has-magic.js         index.js.map      processor.js.map    
 has-magic.js.map     package.json      walker.d.ts         
 ignore.d.ts          pattern.d.ts      walker.d.ts.map     

./node_modules/glob/dist/esm:
 bin.d.mts            has-magic.js.map   pattern.d.ts.map
 bin.d.mts.map        ignore.d.ts        pattern.js
 bin.mjs              ignore.d.ts.map    pattern.js.map
 bin.mjs.map          ignore.js          processor.d.ts
 glob.d.ts            ignore.js.map      processor.d.ts.map
 glob.d.ts.map        index.d.ts         processor.js
 glob.js              index.d.ts.map     processor.js.map
 glob.js.map          index.js           walker.d.ts
 has-magic.d.ts       index.js.map       walker.d.ts.map
 has-magic.d.ts.map   package.json       walker.js
 has-magic.js         pattern.d.ts       walker.js.map

./node_modules/glob/node_modules:
 minimatch

./node_modules/glob/node_modules/minimatch:
 dist   LICENSE   package.json   README.md

./node_modules/glob/node_modules/minimatch/dist:
 commonjs   esm

./node_modules/glob/node_modules/minimatch/dist/commonjs:
 assert-valid-pattern.d.ts       brace-expressions.js       package.json
 assert-valid-pattern.d.ts.map   brace-expressions.js.map   unescape.d.ts
 assert-valid-pattern.js         escape.d.ts                unescape.d.ts.map
 assert-valid-pattern.js.map     escape.d.ts.map            unescape.js
 ast.d.ts                        escape.js                  unescape.js.map
 ast.d.ts.map                    escape.js.map             
 ast.js                          index.d.ts                
 ast.js.map                      index.d.ts.map            
 brace-expressions.d.ts          index.js                  
 brace-expressions.d.ts.map      index.js.map              

./node_modules/glob/node_modules/minimatch/dist/esm:
 assert-valid-pattern.d.ts       brace-expressions.js       package.json
 assert-valid-pattern.d.ts.map   brace-expressions.js.map   unescape.d.ts
 assert-valid-pattern.js         escape.d.ts                unescape.d.ts.map
 assert-valid-pattern.js.map     escape.d.ts.map            unescape.js
 ast.d.ts                        escape.js                  unescape.js.map
 ast.d.ts.map                    escape.js.map             
 ast.js                          index.d.ts                
 ast.js.map                      index.d.ts.map            
 brace-expressions.d.ts          index.js                  
 brace-expressions.d.ts.map      index.js.map              

./node_modules/glob-parent:
 CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/glob-to-regexp:
 index.js   package.json   README.md   test.js

./node_modules/global-agent:
 dist   src   bootstrap.js   LICENSE   package.json   README.md

./node_modules/global-agent/dist:
 classes     errors.js        index.js.flow    Logger.js.map
 factories   errors.js.flow   index.js.map     types.js
 routines    errors.js.map    Logger.js        types.js.flow
 utilities   index.js         Logger.js.flow   types.js.map

./node_modules/global-agent/dist/classes:
 Agent.js            HttpProxyAgent.js.flow    HttpsProxyAgent.js.map
 Agent.js.flow       HttpProxyAgent.js.map     index.js
 Agent.js.map        HttpsProxyAgent.js        index.js.flow
 HttpProxyAgent.js   HttpsProxyAgent.js.flow   index.js.map

./node_modules/global-agent/dist/factories:
 createGlobalProxyAgent.js        createProxyController.js.map
 createGlobalProxyAgent.js.flow   index.js
 createGlobalProxyAgent.js.map    index.js.flow
 createProxyController.js         index.js.map
 createProxyController.js.flow   

./node_modules/global-agent/dist/routines:
 bootstrap.js        bootstrap.js.map   index.js.flow
 bootstrap.js.flow   index.js           index.js.map

./node_modules/global-agent/dist/utilities:
 bindHttpMethod.js        isUrlMatchingNoProxy.js
 bindHttpMethod.js.flow   isUrlMatchingNoProxy.js.flow
 bindHttpMethod.js.map    isUrlMatchingNoProxy.js.map
 index.js                 parseProxyUrl.js
 index.js.flow            parseProxyUrl.js.flow
 index.js.map             parseProxyUrl.js.map

./node_modules/global-agent/src:
 classes     routines    errors.js   Logger.js
 factories   utilities   index.js    types.js

./node_modules/global-agent/src/classes:
 Agent.js   HttpProxyAgent.js   HttpsProxyAgent.js   index.js

./node_modules/global-agent/src/factories:
 createGlobalProxyAgent.js   createProxyController.js   index.js

./node_modules/global-agent/src/routines:
 bootstrap.js   index.js

./node_modules/global-agent/src/utilities:
 bindHttpMethod.js   index.js   isUrlMatchingNoProxy.js   parseProxyUrl.js

./node_modules/globals:
 globals.json   index.js   license   package.json   readme.md

./node_modules/globalthis:
 test           implementation.browser.js   LICENSE        README.md
 auto.js        implementation.js           package.json   shim.js
 CHANGELOG.md   index.js                    polyfill.js   

./node_modules/globalthis/test:
 implementation.js   index.js   native.js   shimmed.js   tests.js

./node_modules/gopd:
 test           gOPD.d.ts   index.d.ts   LICENSE        README.md
 CHANGELOG.md   gOPD.js     index.js     package.json   tsconfig.json

./node_modules/gopd/test:
 index.js

./node_modules/got:
 dist   license   package.json   readme.md

./node_modules/got/dist:
 source

./node_modules/got/dist/source:
 as-promise   utils         create.js    index.js     types.js
 core         create.d.ts   index.d.ts   types.d.ts  

./node_modules/got/dist/source/as-promise:
 create-rejection.d.ts   normalize-arguments.d.ts   types.d.ts
 create-rejection.js     normalize-arguments.js     types.js
 index.d.ts              parse-body.d.ts           
 index.js                parse-body.js             

./node_modules/got/dist/source/core:
 utils                        calculate-retry-delay.js   index.js
 calculate-retry-delay.d.ts   index.d.ts                

./node_modules/got/dist/source/core/utils:
 dns-ip-version.d.ts   is-response-ok.d.ts   unhandle.d.ts
 dns-ip-version.js     is-response-ok.js     unhandle.js
 get-body-size.d.ts    options-to-url.d.ts   url-to-options.d.ts
 get-body-size.js      options-to-url.js     url-to-options.js
 get-buffer.d.ts       proxy-events.d.ts     weakable-map.d.ts
 get-buffer.js         proxy-events.js       weakable-map.js
 is-form-data.d.ts     timed-out.d.ts       
 is-form-data.js       timed-out.js         

./node_modules/got/dist/source/utils:
 deep-freeze.d.ts   deprecation-warning.d.ts
 deep-freeze.js     deprecation-warning.js

./node_modules/graceful-fs:
 clone.js         legacy-streams.js   package.json   README.md
 graceful-fs.js   LICENSE             polyfills.js  

./node_modules/handle-thing:
 lib   test   package.json   README.md

./node_modules/handle-thing/lib:
 handle.js   queue.js

./node_modules/handle-thing/test:
 api-test.js

./node_modules/has-flag:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/has-property-descriptors:
 test   CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/has-property-descriptors/test:
 index.js

./node_modules/has-symbols:
 test           index.d.ts   LICENSE        README.md    shams.js
 CHANGELOG.md   index.js     package.json   shams.d.ts   tsconfig.json

./node_modules/has-symbols/test:
 shams   index.js   tests.js

./node_modules/has-symbols/test/shams:
 core-js.js   get-own-property-symbols.js

./node_modules/has-unicode:
 index.js   LICENSE   package.json   README.md

./node_modules/hasown:
 CHANGELOG.md   index.js   package.json   tsconfig.json
 index.d.ts     LICENSE    README.md     

./node_modules/hosted-git-info:
 node_modules       git-host.js   LICENSE        README.md
 git-host-info.js   index.js      package.json  

./node_modules/hosted-git-info/node_modules:
 lru-cache

./node_modules/hosted-git-info/node_modules/lru-cache:
 index.js   LICENSE   package.json   README.md

./node_modules/hpack.js:
 bin   lib   node_modules   test   tools   package.json   README.md

./node_modules/hpack.js/bin:
 benchmark

./node_modules/hpack.js/lib:
 hpack   hpack.js

./node_modules/hpack.js/lib/hpack:
 compressor.js   decompressor.js   huffman.js        table.js
 decoder.js      encoder.js        static-table.js   utils.js

./node_modules/hpack.js/node_modules:
 core-util-is   readable-stream   safe-buffer   string_decoder

./node_modules/hpack.js/node_modules/core-util-is:
 lib   LICENSE   package.json   README.md

./node_modules/hpack.js/node_modules/core-util-is/lib:
 util.js

./node_modules/hpack.js/node_modules/readable-stream:
 doc                 GOVERNANCE.md         readable.js
 lib                 LICENSE               README.md
 CONTRIBUTING.md     package.json          transform.js
 duplex-browser.js   passthrough.js        writable-browser.js
 duplex.js           readable-browser.js   writable.js

./node_modules/hpack.js/node_modules/readable-stream/doc:
 wg-meetings

./node_modules/hpack.js/node_modules/readable-stream/doc/wg-meetings:
 2015-01-30.md

./node_modules/hpack.js/node_modules/readable-stream/lib:
 internal            _stream_passthrough.js   _stream_transform.js
 _stream_duplex.js   _stream_readable.js      _stream_writable.js

./node_modules/hpack.js/node_modules/readable-stream/lib/internal:
 streams

./node_modules/hpack.js/node_modules/readable-stream/lib/internal/streams:
 BufferList.js   destroy.js   stream-browser.js   stream.js

./node_modules/hpack.js/node_modules/safe-buffer:
 index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/hpack.js/node_modules/string_decoder:
 lib   LICENSE   package.json   README.md

./node_modules/hpack.js/node_modules/string_decoder/lib:
 string_decoder.js

./node_modules/hpack.js/test:
 compressor-test.js   decompressor-test.js   fixtures.js
 decoder-test.js      encoder-test.js       

./node_modules/hpack.js/tools:
 gen-huffman.js   gen-static-table.js   utils.js

./node_modules/http-cache-semantics:
 index.js   LICENSE   package.json   README.md

./node_modules/http-deceiver:
 lib   test   package.json   README.md

./node_modules/http-deceiver/lib:
 deceiver.js

./node_modules/http-deceiver/test:
 api-test.js

./node_modules/http-errors:
 HISTORY.md   index.js   LICENSE   package.json   README.md

./node_modules/http-parser-js:
 http-parser.d.ts   http-parser.js   LICENSE.md   package.json   README.md

./node_modules/http-proxy:
 lib                  codecov.yml   package.json
 CHANGELOG.md         index.js      README.md
 CODE_OF_CONDUCT.md   LICENSE       renovate.json

./node_modules/http-proxy/lib:
 http-proxy   http-proxy.js

./node_modules/http-proxy/lib/http-proxy:
 passes   common.js   index.js

./node_modules/http-proxy/lib/http-proxy/passes:
 web-incoming.js   web-outgoing.js   ws-incoming.js

./node_modules/http-proxy-agent:
 dist   LICENSE   package.json   README.md

./node_modules/http-proxy-agent/dist:
 index.d.ts   index.d.ts.map   index.js   index.js.map

./node_modules/http-proxy-middleware:
 dist   LICENSE   package.json   README.md

./node_modules/http-proxy-middleware/dist:
 handlers               errors.d.ts                  logger.js
 _handlers.d.ts         errors.js                    path-rewriter.d.ts
 _handlers.js           http-proxy-middleware.d.ts   path-rewriter.js
 config-factory.d.ts    http-proxy-middleware.js     router.d.ts
 config-factory.js      index.d.ts                   router.js
 context-matcher.d.ts   index.js                     types.d.ts
 context-matcher.js     logger.d.ts                  types.js

./node_modules/http-proxy-middleware/dist/handlers:
 fix-request-body.d.ts   index.js      response-interceptor.d.ts
 fix-request-body.js     public.d.ts   response-interceptor.js
 index.d.ts              public.js    

./node_modules/http2-wrapper:
 source   LICENSE   package.json   README.md

./node_modules/http2-wrapper/source:
 utils      auto.js             incoming-message.js
 agent.js   client-request.js   index.js

./node_modules/http2-wrapper/source/utils:
 calculate-server-name.js   is-request-pseudo-header.js   url-to-options.js
 errors.js                  proxy-events.js              

./node_modules/https-proxy-agent:
 dist   LICENSE   package.json   README.md

./node_modules/https-proxy-agent/dist:
 index.d.ts       index.js.map                    parse-proxy-response.js
 index.d.ts.map   parse-proxy-response.d.ts       parse-proxy-response.js.map
 index.js         parse-proxy-response.d.ts.map  

./node_modules/humanize-ms:
 History.md   index.js   LICENSE   package.json   README.md

./node_modules/hyperdyperid:
 lib   CHANGELOG.md   LICENSE   package.json   README.md

./node_modules/hyperdyperid/lib:
 __tests__      randomU32.d.ts   str3_36.js     str10_36.d.ts
 codegen.js     randomU32.js     str5_36.d.ts   str10_36.js
 hyperid.d.ts   str.d.ts         str5_36.js     xorshift32.d.ts
 hyperid.js     str.js           str6_36.d.ts   xorshift32.js
 maps.js        str3_36.d.ts     str6_36.js    

./node_modules/hyperdyperid/lib/__tests__:
 randomU32.spec.js   str5_36.spec.js

./node_modules/iconv-corefoundation:
 lib   LICENSE   package.json   README.md

./node_modules/iconv-corefoundation/lib:
 errors.d.ts   index.d.ts   native.d.ts   native.node
 errors.js     index.js     native.js    

./node_modules/iconv-lite:
 encodings   lib   Changelog.md   LICENSE   package.json   README.md

./node_modules/iconv-lite/encodings:
 tables          index.js        sbcs-data-generated.js   utf16.js
 dbcs-codec.js   internal.js     sbcs-data.js             utf32.js
 dbcs-data.js    sbcs-codec.js   utf7.js                 

./node_modules/iconv-lite/encodings/tables:
 big5-added.json   cp949.json   eucjp.json            gbk-added.json
 cp936.json        cp950.json   gb18030-ranges.json   shiftjis.json

./node_modules/iconv-lite/lib:
 bom-handling.js   index.d.ts   index.js   streams.js

./node_modules/ieee754:
 index.d.ts   index.js   LICENSE   package.json   README.md

./node_modules/import-local:
 fixtures       index.d.ts   license        readme.md
 node_modules   index.js     package.json  

./node_modules/import-local/fixtures:
 cli.js

./node_modules/import-local/node_modules:
 find-up   locate-path   p-limit   p-locate   path-exists   pkg-dir

./node_modules/import-local/node_modules/find-up:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/import-local/node_modules/locate-path:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/import-local/node_modules/p-limit:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/import-local/node_modules/p-locate:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/import-local/node_modules/path-exists:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/import-local/node_modules/pkg-dir:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/imurmurhash:
 imurmurhash.js   imurmurhash.min.js   package.json   README.md

./node_modules/indent-string:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/infer-owner:
 index.js   LICENSE   package.json   README.md

./node_modules/inflight:
 inflight.js   LICENSE   package.json   README.md

./node_modules/inherits:
 inherits.js   inherits_browser.js   LICENSE   package.json   README.md

./node_modules/interpret:
 cjs-stub.js   index.js   LICENSE   mjs-stub.js   package.json   README.md

./node_modules/ip-address:
 dist   src   LICENSE   package.json   README.md

./node_modules/ip-address/dist:
 v4                       common.d.ts.map       ipv4.d.ts       ipv6.js.map
 v6                       common.js             ipv4.d.ts.map  
 address-error.d.ts       common.js.map         ipv4.js        
 address-error.d.ts.map   ip-address.d.ts       ipv4.js.map    
 address-error.js         ip-address.d.ts.map   ipv6.d.ts      
 address-error.js.map     ip-address.js         ipv6.d.ts.map  
 common.d.ts              ip-address.js.map     ipv6.js        

./node_modules/ip-address/dist/v4:
 constants.d.ts   constants.d.ts.map   constants.js   constants.js.map

./node_modules/ip-address/dist/v6:
 constants.d.ts       helpers.js
 constants.d.ts.map   helpers.js.map
 constants.js         regular-expressions.d.ts
 constants.js.map     regular-expressions.d.ts.map
 helpers.d.ts         regular-expressions.js
 helpers.d.ts.map     regular-expressions.js.map

./node_modules/ip-address/src:
 v4   address-error.ts   ip-address.ts   ipv6.ts
 v6   common.ts          ipv4.ts        

./node_modules/ip-address/src/v4:
 constants.ts

./node_modules/ip-address/src/v6:
 constants.ts   helpers.ts   regular-expressions.ts

./node_modules/ipaddr.js:
 lib   ipaddr.min.js   LICENSE   package.json   README.md

./node_modules/ipaddr.js/lib:
 ipaddr.js   ipaddr.js.d.ts

./node_modules/is-binary-path:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/is-ci:
 bin.js   CHANGELOG.md   index.js   LICENSE   package.json   README.md

./node_modules/is-core-module:
 test           core.json   LICENSE        README.md
 CHANGELOG.md   index.js    package.json  

./node_modules/is-core-module/test:
 index.js

./node_modules/is-docker:
 cli.js   index.d.ts   index.js   license   package.json   readme.md

./node_modules/is-extglob:
 index.js   LICENSE   package.json   README.md

./node_modules/is-fullwidth-code-point:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/is-glob:
 index.js   LICENSE   package.json   README.md

./node_modules/is-inside-container:
 cli.js   index.d.ts   index.js   license   package.json   readme.md

./node_modules/is-interactive:
 index.d.ts   index.js   license   package.json   readme.md

./node_modules/is-lambda:
 index.js   LICENSE   package.json   README.md   test.js

./packages:
 main   renderer

./packages/main:
 main.js   package.json   preload.js

./packages/renderer:
 public   src   package.json

./packages/renderer/public:
 index.html

./packages/renderer/src:
 App.jsx   index.jsx
{
  "name": "imgnx-electron-app",
  "version": "1.0.0",
  "description": "IMGNXTION Electron application description",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "electron-builder"
  },
  "author": "Your Name",
  "license": "0BSD",
  "devDependencies": {
    "electron": "^latest_version",
    "electron-builder": "^latest_version"
  },
  "dependencies": {},
  "build": {
    "appId": "com.your.app",
    "mac": {
      "category": "your.app.category"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV !== "production";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Open the DevTools automatically (optional)
  mainWindow.webContents.openDevTools();

  // In development, use the hosted version
  if (isDev) {
    console.log("Loading development server...");
    mainWindow.loadURL("http://localhost:3000");
  } else {
    console.log("Loading production build...");
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }

  // Log any load failures
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    },
  );
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
❯ q chat

Hi, I'm Amazon Q. I can answer questions about your shell and CLI tools!
You can include additional context by adding the following to your prompt:

@history to pass your shell history
@git to pass information about your current git repository
@env to pass your shell environment

> I've run the commands that you've asked for. Can you tell me if there is anything wrong with my current Workspace? @git @env @history
Using shell history
Using git context
Using environment

Looking at your command history and workspace state, I notice a few things:

1. Package Management Inconsistency:
   • You're mixing package managers (yarn and npm) in your recent commands, 
which could lead to conflicts. It's best to stick to one package manager 
throughout your project.
   • You removed yarn.lock but may still have node_modules from different 
package managers.

2. Git Status:
   • You have uncommitted changes in packages/main/package.json
   • Your local branch is ahead of origin by 1 commit, meaning you have changes 
that haven't been pushed

3. Project Setup:
   • You've set up a React + Electron project with Webpack
   • You've configured Babel with React preset in .babelrc
   • The project appears to be using a monorepo structure (packages/main/)

Recommendations:

1. Clean up package management:
zsh
# Remove existing dependency files
rm -rf node_modules
rm -f package-lock.json yarn.lock

# Choose one package manager (e.g., yarn) and reinstall
yarn install


2. Resolve git changes:
zsh
# Review your package.json changes
git diff packages/main/package.json

# Commit if the changes are intended
git add packages/main/package.json
git commit -m "Update package.json dependencies"

# Push your changes
git push origin main


3. Consider adding a .gitignore file if you haven't already to exclude 
node_modules and other build artifacts.

Would you like me to provide more specific guidance on any of these areas?

> 
