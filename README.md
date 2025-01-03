# Electron.js + Bazel Boilerplate 

<!-- Q: RE: ^> -->

> Why are we disabling NodeIntegration?

We disable nodeIntegration for security reasons, particularly to prevent potential Cross-Site Scripting (XSS) attacks and unauthorized access to Node.js APIs. Here's a detailed explanation: [1]

<ol>
<li><span>Security Risks with nodeIntegration enabled:</span>
<ul>
<li>

```javascript
// With nodeIntegration: true, malicious code could do this:
const { exec } = require('child_process');
exec('rm -rf /*') // Dangerous system-level access
// Or access file system
const fs = require('fs')
fs.readFile('/path/to/sensitive/data')
```

</li>
</ul>
</li>

<li><span>The secure approach using <code>contextBridge</code>:</span>

```javascript
// preload.js - Controlled exposure of specific features
const { contextBridge } = require('electron');

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
```

</li>

</ol>


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

```javascript
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
```

4. Safe pattern for IPC communication:

```javascript
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
```

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

> Where do I put the Yarn Workspace file?

The Yarn workspace configuration goes in the root package.json of your project. 
Here's how to structure it: [1]

```bash
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
```

> What goes into the package.json file for the renderer process?

Here's a comprehensive package.json setup for the renderer process:

```json
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
```

Optional but recommended additions for a more complete setup:

```json
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
```

For TypeScript configuration, include a tsconfig.json in the same directory:

```json
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
```

For path aliases (optional but helpful), add to tsconfig.json:

```json
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
```

Remember to:

1. Keep your renderer dependencies separate from main process dependencies
2. Use appropriate version numbers for your needs
3. Consider adding peer dependencies if needed
4. Add any specific dependencies your project requires
5. Update browserslist config based on your target platforms

The exact dependencies you'll need might vary based on your specific requirements, but this provides a solid foundation for a React-based Electron renderer process.
