/**
 * The small slice of Google's browser libraries the app uses. Both scripts
 * are loaded on demand, only after the user chooses Google Drive, so these
 * globals exist only then; every use goes through `lib/storage/google-drive.ts`.
 */
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token?: string;
    expires_in?: string | number;
    scope?: string;
    error?: string;
    error_description?: string;
  }
  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }
  interface OverridableTokenClientConfig {
    prompt?: "" | "none" | "consent" | "select_account";
    hint?: string;
  }
  interface TokenClient {
    requestAccessToken(overrides?: OverridableTokenClientConfig): void;
  }
  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(accessToken: string, done?: () => void): void;
}

declare namespace google.picker {
  const Action: { PICKED: string; CANCEL: string };
  const ViewId: { DOCS: string; FOLDERS: string };
  const Feature: { NAV_HIDDEN: string; MINE_ONLY: string };
  interface Document {
    id: string;
    name: string;
    mimeType?: string;
    parentId?: string;
  }
  interface ResponseObject {
    action: string;
    docs?: Document[];
  }
  class DocsView {
    constructor(viewId?: string);
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
    setMode(mode: string): DocsView;
    setParent(parentId: string): DocsView;
  }
  const DocsViewMode: { LIST: string; GRID: string };
  class PickerBuilder {
    addView(view: DocsView): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setAppId(appId: string): PickerBuilder;
    setTitle(title: string): PickerBuilder;
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
    enableFeature(feature: string): PickerBuilder;
    build(): Picker;
  }
  interface Picker {
    setVisible(visible: boolean): void;
    dispose(): void;
  }
}

declare const gapi: {
  load(library: string, callback: () => void): void;
};
