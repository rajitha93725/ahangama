import {
  cn,
  formatCurrency,
  formatDate,
  formatDateRange,
  calcNights,
  truncate,
  getInitials,
  timeAgo,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1500)).toBe("$1,500");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats with custom currency", () => {
    const result = formatCurrency(1000, "EUR");
    expect(result).toContain("1,000");
  });

  it("rounds to whole number", () => {
    expect(formatCurrency(99.99)).toBe("$100");
  });
});

describe("formatDate", () => {
  it("formats a Date object", () => {
    const result = formatDate(new Date("2026-01-15"));
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("formats a date string", () => {
    const result = formatDate("2026-06-01");
    expect(result).toContain("Jun");
    expect(result).toContain("2026");
  });
});

describe("formatDateRange", () => {
  it("formats a date range", () => {
    const result = formatDateRange("2026-01-10", "2026-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("10");
    expect(result).toContain("15");
    expect(result).toContain("–");
  });
});

describe("calcNights", () => {
  it("calculates nights between two dates", () => {
    expect(calcNights("2026-01-01", "2026-01-05")).toBe(4);
  });

  it("returns 0 for same date", () => {
    expect(calcNights("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("returns 1 for consecutive days", () => {
    expect(calcNights("2026-03-10", "2026-03-11")).toBe(1);
  });

  it("handles Date objects", () => {
    const checkIn = new Date("2026-06-01");
    const checkOut = new Date("2026-06-08");
    expect(calcNights(checkIn, checkOut)).toBe(7);
  });
});

describe("truncate", () => {
  it("returns original string if shorter than maxLen", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncate("hello world this is long", 10)).toBe("hello worl…");
  });

  it("returns exact length string unchanged", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("getInitials", () => {
  it("returns initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("returns ? for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });

  it("limits to 2 initials for long names", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });
});

describe("timeAgo", () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(date)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe("2d ago");
  });

  it("returns formatted date for old dates", () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = timeAgo(date);
    // Should be a formatted date, not "Xd ago"
    expect(result).not.toContain("d ago");
  });
});
