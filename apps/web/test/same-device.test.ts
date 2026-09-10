import { describe, expect, it } from "vitest";
import { openPeerChannel } from "../src/lib/storage/same-device";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("the same-device channel", () => {
  it("reaches the other tabs with the same file open, not the sender and not other files", async () => {
    const heard: string[] = [];
    const a = openPeerChannel("drive:abc", (revision) => heard.push(`a:${revision}`))!;
    const b = openPeerChannel("drive:abc", (revision) => heard.push(`b:${revision}`))!;
    const c = openPeerChannel("drive:xyz", (revision) => heard.push(`c:${revision}`))!;
    a.announce("7");
    await settle();
    expect(heard).toEqual(["b:7"]);
    b.announce("8");
    await settle();
    expect(heard).toEqual(["b:7", "a:8"]);
    a.close();
    b.close();
    c.close();
  });

  it("ignores a message that is not a revision", async () => {
    const heard: string[] = [];
    const listener = openPeerChannel("local:ideas.ideamatrix.json", (revision) => heard.push(revision))!;
    const raw = new BroadcastChannel("ideamatrix.file.local:ideas.ideamatrix.json");
    raw.postMessage({ something: "else" });
    raw.postMessage("text");
    raw.postMessage({ revision: "42" });
    await settle();
    expect(heard).toEqual(["42"]);
    listener.close();
    raw.close();
  });
});
