import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'path'
import { startSidecar, stopSidecar, getSidecarPort } from './sidecar'

// Disable hardware acceleration to prevent potential rendering issues
app.disableHardwareAcceleration()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js')
  console.log('[Main] Preload path:', preloadPath)
  
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Video Player 2.0',
    backgroundColor: '#000000',
    minWidth: 1000,
    minHeight: 600,
  })

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  createMenu()
}

function createMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+H',
          click: () => win?.webContents.send('go-home')
        },
        {
          label: 'Open Video',
          accelerator: 'CmdOrCtrl+O',
          click: () => win?.webContents.send('trigger-import')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Theme',
      submenu: [
        {
          label: 'Modes',
          submenu: [
            {
              label: 'Light Mode',
              click: () => win?.webContents.send('set-theme', 'light')
            },
            {
              label: 'Dark Mode',
              click: () => win?.webContents.send('set-theme', 'dark')
            }
          ]
        },
        {
          label: 'Palettes',
          submenu: [
            { label: 'Default', click: () => win?.webContents.send('set-palette', '') },
            { label: 'Sunset', click: () => win?.webContents.send('set-palette', 'sunset') },
            { label: 'Forest', click: () => win?.webContents.send('set-palette', 'forest') },
            { label: 'Ocean', click: () => win?.webContents.send('set-palette', 'ocean') },
            { label: 'Nebula', click: () => win?.webContents.send('set-palette', 'nebula') }
          ]
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC Handlers
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] }
    ]
  })
  if (!canceled) {
    return filePaths[0]
  }
  return null
})

ipcMain.handle('get-sidecar-port', async () => {
  return await getSidecarPort();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', async () => {
  await stopSidecar()
})

app.whenReady().then(async () => {
  createWindow()
  await startSidecar()
})
