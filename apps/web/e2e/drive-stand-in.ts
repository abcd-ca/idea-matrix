import type { BrowserContext, Route } from "@playwright/test";

/**
 * A stand-in for Google Drive, the same idea as the file-dialog stand-in in
 * helpers.ts: the app's own code runs unchanged, and the parts that would
 * reach Google are answered here instead. Google's two scripts (sign-in and
 * the picker) are replaced with small ones that hand back a token and a pick
 * without any UI, and the Drive REST calls the app makes (files.get for
 * metadata and for content, files.list for the duplicate check, the two
 * uploads and the folder create) are served from a map in the test process.
 *
 * Because the files live in Node rather than in the browser, two browser
 * contexts, which share nothing (no IndexedDB, no BroadcastChannel), can
 * work on one file the way a computer and a phone do. A version counter that
 * moves on every write plays Drive's `version` field, which is what the app's
 * revision check and watcher key on.
 *
 * Any request to a Google host the stand-in does not recognise is aborted
 * and recorded in `unexpected`; a spec asserts that list is empty.
 */

export const GOOGLE_HOSTS = ["https://accounts.google.com", "https://apis.google.com", "https://www.googleapis.com"];
export const FAKE_TOKEN = "stand-in-token";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  content: string;
  version: number;
  trashed: boolean;
}

/** Loaded in place of https://accounts.google.com/gsi/client. */
const GSI_SCRIPT = `
window.google = window.google || {};
window.google.accounts = {
  oauth2: {
    initTokenClient(config) {
      return {
        requestAccessToken() {
          setTimeout(() => config.callback({ access_token: ${JSON.stringify(FAKE_TOKEN)}, expires_in: 3600 }), 0);
        },
      };
    },
    revoke(token, done) {
      if (done) done();
    },
  },
};
`;

/**
 * Loaded in place of https://apis.google.com/js/api.js. The picker "picks"
 * whatever the test put in window.__ideamatrixPick, or cancels when nothing
 * is there, after window.__ideamatrixPickDelay milliseconds if a test set
 * that; every builder and view method returns itself, as Google's do.
 */
const GAPI_SCRIPT = `
window.gapi = { load(name, callback) { setTimeout(callback, 0); } };
window.google = window.google || {};
function chain(methods) {
  const self = {};
  for (const m of methods) self[m] = () => self;
  return self;
}
window.google.picker = {
  Action: { PICKED: "picked", CANCEL: "cancel" },
  ViewId: { DOCS: "docs", FOLDERS: "folders" },
  Feature: { NAV_HIDDEN: "navHidden", MINE_ONLY: "mineOnly" },
  DocsViewMode: { LIST: "list", GRID: "grid" },
  DocsView: function () {
    return chain(["setIncludeFolders", "setSelectFolderEnabled", "setMimeTypes", "setMode", "setParent"]);
  },
  PickerBuilder: function () {
    let callback = null;
    const builder = chain(["addView", "setOAuthToken", "setDeveloperKey", "setAppId", "setTitle", "enableFeature"]);
    builder.setCallback = (cb) => { callback = cb; return builder; };
    builder.build = () => ({
      setVisible() {
        const doc = window.__ideamatrixPick;
        // __ideamatrixPickDelay keeps the picker "open" that long first, for what the app shows beside it.
        const delay = window.__ideamatrixPickDelay || 0;
        setTimeout(() => callback(doc ? { action: "picked", docs: [doc] } : { action: "cancel" }), delay);
      },
      dispose() {},
    });
    return builder;
  },
};
`;

export class DriveStandIn {
  private readonly files = new Map<string, StoredFile>();
  private nextId = 1;
  /** Requests to Google's hosts that this stand-in did not recognise. */
  readonly unexpected: string[] = [];

  /** Answer Google's scripts and the Drive API for every page in the context. */
  async install(context: BrowserContext): Promise<void> {
    await context.route(`${GOOGLE_HOSTS[0]}/**`, (route) => this.script(route, "/gsi/client", GSI_SCRIPT));
    await context.route(`${GOOGLE_HOSTS[1]}/**`, (route) => this.script(route, "/js/api.js", GAPI_SCRIPT));
    await context.route(`${GOOGLE_HOSTS[2]}/**`, (route) => this.drive(route));
  }

  /** A file the app has not made itself, as if it were already in Drive. */
  create(name: string, content: string, mimeType = "application/json", parents: string[] = []): StoredFile {
    const file: StoredFile = {
      id: `file-${this.nextId++}`,
      name,
      mimeType,
      parents,
      content,
      version: 1,
      trashed: false,
    };
    this.files.set(file.id, file);
    return file;
  }

  fileNamed(name: string): StoredFile | undefined {
    return [...this.files.values()].find((file) => file.name === name && file.mimeType !== FOLDER_MIME);
  }

  read(id: string): string {
    return this.must(id).content;
  }

  /** A write from somewhere else: another device, or Drive's own web app. */
  write(id: string, content: string): void {
    const file = this.must(id);
    file.content = content;
    file.version += 1;
  }

  private must(id: string): StoredFile {
    const file = this.files.get(id);
    if (!file) throw new Error(`No such file in the stand-in: ${id}`);
    return file;
  }

  private async script(route: Route, path: string, body: string): Promise<void> {
    if (new URL(route.request().url()).pathname !== path) return this.reject(route);
    await route.fulfill({ status: 200, contentType: "application/javascript", body });
  }

  private async reject(route: Route): Promise<void> {
    this.unexpected.push(`${route.request().method()} ${route.request().url()}`);
    await route.abort();
  }

  private async drive(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (request.headers()["authorization"] !== `Bearer ${FAKE_TOKEN}`) {
      return json(401, { error: { message: "Invalid Credentials" } });
    }
    const upload = url.pathname.startsWith("/upload/");
    const match = /^(?:\/upload)?\/drive\/v3\/files(?:\/([^/]+))?$/.exec(url.pathname);
    if (!match) return this.reject(route);
    const id = match[1] ? decodeURIComponent(match[1]) : null;
    const method = request.method();

    if (method === "GET" && id) {
      const file = this.files.get(id);
      if (!file) return json(404, { error: { message: "File not found" } });
      if (url.searchParams.get("alt") === "media") {
        return route.fulfill({ status: 200, contentType: file.mimeType, body: file.content });
      }
      return json(200, info(file));
    }
    if (method === "GET") {
      // files.list with the query the app builds: name, trashed, mimeType and maybe a parent.
      const q = url.searchParams.get("q") ?? "";
      const unquote = (s: string) => s.replace(/\\(.)/g, "$1");
      const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)?.[1];
      const mime = /mimeType = '((?:[^'\\]|\\.)*)'/.exec(q)?.[1];
      const parent = /'((?:[^'\\]|\\.)*)' in parents/.exec(q)?.[1];
      const files = [...this.files.values()].filter(
        (file) =>
          !file.trashed &&
          (name === undefined || file.name === unquote(name)) &&
          (mime === undefined || file.mimeType === unquote(mime)) &&
          (parent === undefined || file.parents.includes(unquote(parent))),
      );
      return json(200, { files: files.map(info) });
    }
    if (method === "POST" && !upload && !id) {
      const metadata = JSON.parse(request.postData() ?? "{}") as { name: string; mimeType: string; parents?: string[] };
      return json(200, info(this.create(metadata.name, "", metadata.mimeType, metadata.parents ?? [])));
    }
    if (method === "POST" && upload && !id) {
      const boundary = /boundary=(.+)$/.exec(request.headers()["content-type"] ?? "")?.[1];
      const parts = (request.postData() ?? "").split(`--${boundary}`).slice(1, -1);
      const bodyOf = (part: string) => part.slice(part.indexOf("\r\n\r\n") + 4).replace(/\r\n$/, "");
      const metadata = JSON.parse(bodyOf(parts[0])) as { name: string; mimeType: string; parents?: string[] };
      return json(200, info(this.create(metadata.name, bodyOf(parts[1]), metadata.mimeType, metadata.parents ?? [])));
    }
    if (method === "PATCH" && upload && id) {
      const file = this.files.get(id);
      if (!file) return json(404, { error: { message: "File not found" } });
      this.write(id, request.postData() ?? "");
      return json(200, info(file));
    }
    return this.reject(route);
  }
}

function info(file: StoredFile) {
  return { id: file.id, name: file.name, version: String(file.version), trashed: file.trashed };
}
