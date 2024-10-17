/* eslint-disable @typescript-eslint/no-var-requires */
const {app, BrowserWindow, screen, Tray} = require("electron")
const path = require("path")
require("@electron/remote/main").initialize()
/* eslint-enable @typescript-eslint/no-var-requires */

function createWindow(isDev) {
  const {width, height} = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    icon: path.join(__dirname, "../src/assets/nestr-logo-no-name.png"),
    width: width,
    height: height,
    webPreferences: {
      nodeIntegration: true, // allow access to local file system
      enableRemoteModule: true,
      contextIsolation: false, // Ensure contextIsolation is false if using nodeIntegration
    },
  })

  // remove the Electron menu bar eventually
  //win.removeMenu()

  win.loadURL(
    isDev
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../build/index.html")}`
  )
}

// Use dynamic import for electron-is-dev
import("electron-is-dev")
  .then((module) => {
    const isDev = module.default

    app.whenReady().then(() => createWindow(isDev))

    let tray = null

    app.whenReady().then(() => {
      const iconPath = path.join(__dirname, "../src/assets/nestr-logo-no-name.png")
      tray = new Tray(iconPath)
    })

    tray.setToolTip("Nestr")

    app.dock.setIcon(path.join(__dirname, "../src/assets/nestr-logo-no-name.png"))

    // Quit when all windows are closed
    app.on("window-all-closed", function () {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== "darwin") {
        app.quit()
      }
    })

    app.on("activate", function () {
      // On OS X it is common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow(isDev)
    })
  })
  .catch((error) => console.error("Failed to load electron-is-dev:", error))
