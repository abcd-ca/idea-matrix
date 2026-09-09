/**
 * Two tabs, or two browsers, on this device with the same file open. They
 * share the file, so each would learn of the other's save from the watcher
 * within its interval; a BroadcastChannel named after the file tells them at
 * once instead, with no round trip to disk or to Drive. The channel is scoped
 * to the browser profile and the origin, so it never crosses machines, and
 * the message carries nothing but the revision just written: the receiver
 * reads the file itself, the same way it does on a tick of the watcher.
 */

const PREFIX = "ideamatrix.file.";

export interface PeerChannel {
  /** Tell the other tabs a write just landed at this revision. */
  announce(revision: string): void;
  close(): void;
}

interface PeerMessage {
  revision: string;
}

/** Null where the browser has no BroadcastChannel; everything then rests on the watcher. */
export function openPeerChannel(key: string, onPeerSaved: (revision: string) => void): PeerChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(PREFIX + key);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data as Partial<PeerMessage> | null;
    if (data && typeof data.revision === "string") onPeerSaved(data.revision);
  };
  return {
    announce(revision) {
      const message: PeerMessage = { revision };
      channel.postMessage(message);
    },
    close() {
      channel.onmessage = null;
      channel.close();
    },
  };
}
