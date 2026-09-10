import { describe, expect, it } from "vitest";
import { TIP_HEIGHT, tipPlacement } from "../src/lib/drive-picker-tip";

const phone = { width: 390, height: 664 };
const desktop = { width: 1440, height: 900 };

describe("where the folder tip goes", () => {
  it("sits above the dialog when there is room, as wide as the dialog", () => {
    const p = tipPlacement({ top: 120, bottom: 780, left: 200, width: 1040 }, desktop);
    expect(p).toEqual({ top: 120 - TIP_HEIGHT - 8, left: 200, width: 1040, overlaps: false });
  });

  it("goes below the dialog when the top is tight but the bottom is not", () => {
    const p = tipPlacement({ top: 10, bottom: 560, left: 0, width: 390 }, phone);
    expect(p.top).toBe(568);
    expect(p.overlaps).toBe(false);
  });

  it("overlaps the dialog's top edge, narrowed, when it fills the screen", () => {
    const p = tipPlacement({ top: 0, bottom: 664, left: 0, width: 390 }, phone);
    expect(p.overlaps).toBe(true);
    expect(p.top).toBe(8);
    expect(p.width).toBe(390 - 72);
  });

  it("waits at the top of the screen when the dialog is not there to measure", () => {
    const p = tipPlacement(null, phone);
    expect(p.top).toBe(8);
    expect(p.left + p.width).toBeLessThanOrEqual(phone.width);
    expect(p.overlaps).toBe(false);
  });
});
