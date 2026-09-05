/**
 * The parts of the File System Access API that TypeScript's DOM lib does not
 * yet declare. Chrome and Edge implement these; the app feature-detects them.
 */
interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

interface SaveFilePickerOptions extends FilePickerOptions {
  suggestedName?: string;
}

interface Window {
  showOpenFilePicker?(options?: FilePickerOptions & { multiple?: boolean }): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
