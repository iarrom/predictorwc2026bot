import { describe, expect, it } from "vitest";
import { formatMatchDateHeader, getRelativeDayOffset } from "./formatDate";

describe("formatMatchDateHeader", () => {
  it("uses a stable en template without ICU literal commas", () => {
    const iso = "2026-06-11T12:00:00.000Z";
    const formatted = formatMatchDateHeader(iso, "en");

    expect(formatted).not.toContain(",");
    expect(formatted).toMatch(/^[A-Za-z]{3} \d{1,2} [A-Za-z]{3}$/);
  });

  it("matches formatToParts assembly for ru", () => {
    const iso = "2026-06-11T12:00:00.000Z";
    const formatted = formatMatchDateHeader(iso, "ru");
    const parts = new Intl.DateTimeFormat("ru-RU", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).formatToParts(new Date(iso));

    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";

    expect(formatted).toBe(`${weekday}, ${day} ${month}`);
  });
});

describe("getRelativeDayOffset", () => {
  it("returns 0 for today", () => {
    const now = new Date(2026, 5, 14, 12, 0, 0);
    const iso = new Date(2026, 5, 14, 20, 0, 0).toISOString();
    expect(getRelativeDayOffset(iso, now)).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    const now = new Date(2026, 5, 14, 12, 0, 0);
    const iso = new Date(2026, 5, 15, 10, 0, 0).toISOString();
    expect(getRelativeDayOffset(iso, now)).toBe(1);
  });
});
