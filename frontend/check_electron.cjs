/* eslint-env node */
const fs = require('fs');
const path = require('path');
const os = require('os');

function getPlatformPath () {
  const platform = process.env.npm_config_platform || os.platform();

  switch (platform) {
    case 'mas':
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron';
    case 'win32':
      return 'electron.exe';
    default:
      throw new Error('Electron builds are not available on platform: ' + platform);
  }
}

const platformPath = getPlatformPath();
const version = require('./node_modules/electron/package.json').version;

function isInstalled () {
  try {
    const versionPath = path.join(__dirname, 'node_modules', 'electron', 'dist', 'version');
    console.log('Checking versionPath:', versionPath);
    if (!fs.existsSync(versionPath)) {
        console.log('versionPath does not exist');
        return false;
    }
    const versionContent = fs.readFileSync(versionPath, 'utf-8').replace(/^v/, '');
    console.log('versionContent:', versionContent, 'target version:', version);
    if (versionContent !== version) {
      return false;
    }

    const pathTxtPath = path.join(__dirname, 'node_modules', 'electron', 'path.txt');
    console.log('Checking pathTxtPath:', pathTxtPath);
    if (!fs.existsSync(pathTxtPath)) {
        console.log('pathTxtPath does not exist');
        return false;
    }
    const pathTxtContent = fs.readFileSync(pathTxtPath, 'utf-8');
    console.log('pathTxtContent:', pathTxtContent, 'target path:', platformPath);
    if (pathTxtContent !== platformPath) {
      return false;
    }
  } catch (ignored) {
    console.log('Caught error:', ignored);
    return false;
  }

  const electronPath = process.env.ELECTRON_OVERRIDE_DIST_PATH || path.join(__dirname, 'node_modules', 'electron', 'dist', platformPath);
  console.log('Checking electronPath:', electronPath);

  return fs.existsSync(electronPath);
}

console.log('isInstalled():', isInstalled());
