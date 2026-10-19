import { describe, expect, it, vi } from "vitest";
import { formatBytes, intInRange, noWheel } from "./numberInput";

describe("number helpers (17)", () => {
  it("formats sizes in B / KB / MB / GB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1000)).toBe("1000 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(400 * 1024 * 1024)).toBe("400 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });

  it("validates whole numbers in a range", () => {
    expect(intInRange("80", 0, 100)).toBeNull();
    expect(intInRange("150", 0, 100)).toBe("range");
    expect(intInRange("7.5", 1, 500)).toBe("integer");
    expect(intInRange("", 1, 500)).toBe("required");
    expect(intInRange("abc", 1, 500)).toBe("integer");
  });

  it("drops focus on wheel so the value never changes while scrolling", () => {
    const blur = vi.fn();
    noWheel.onWheel({ currentTarget: { blur } });
    expect(blur).toHaveBeenCalled();
  });
});
