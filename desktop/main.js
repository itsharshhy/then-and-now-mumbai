// Then & Now for Mac: a window around the same static game the website serves. The built site
// (Next's out/ folder) ships inside the app and is served from app://game, so it plays offline;
// multiplayer and the bazaar talk to Supabase over the network as they do on the web.
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const SITE = app.isPackaged ? path.join(process.resourcesPath, "site") : path.join(__dirname, "..", "out");
const ORIGIN = "app://game";

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

// /play/ -> play/index.html, /bazaar -> bazaar/index.html, anything outside the site -> 404 page
function fileFor(pathname) {
  const rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  const full = path.normalize(path.join(SITE, rel));
  if (!full.startsWith(SITE)) return null;
  for (const f of [full, path.join(full, "index.html"), `${full}.html`]) {
    try {
      if (fs.statSync(f).isFile()) return f;
    } catch {}
  }
  return null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    title: "Then & Now",
    backgroundColor: "#26365e",
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  // links to other sites (GitHub, sources) open in the browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(ORIGIN)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(ORIGIN)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  win.loadURL(`${ORIGIN}/play/?source=mac`);
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const file = fileFor(new URL(req.url).pathname) || fileFor("404.html");
    return net.fetch(pathToFileURL(file).toString());
  });
  if (process.platform === "darwin") Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }]));
  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
