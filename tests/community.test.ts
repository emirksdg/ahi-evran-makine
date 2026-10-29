import { describe, expect, it } from "vitest";
import {
  parseGroups,
  parsePosts,
  validateGroup,
  validatePostContent,
} from "../src/community";

describe("validatePostContent", () => {
  it("trims a post before accepting it", () => {
    expect(validatePostContent("  Bir fikir.  ")).toEqual({
      valid: true,
      value: "Bir fikir.",
    });
  });

  it("rejects empty or oversized posts", () => {
    expect(validatePostContent("  ").valid).toBe(false);
    expect(validatePostContent("x".repeat(501)).valid).toBe(false);
  });
});

describe("validateGroup", () => {
  it("trims group details and accepts an optional description", () => {
    expect(validateGroup(" Tasarım topluluğu ", " Birlikte üretelim. ")).toEqual({
      valid: true,
      name: "Tasarım topluluğu",
      description: "Birlikte üretelim.",
    });
    expect(validateGroup("Kampüs grubu", "")).toEqual({
      valid: true,
      name: "Kampüs grubu",
      description: "",
    });
  });

  it("rejects blank and oversized group details", () => {
    expect(validateGroup(" ", "").valid).toBe(false);
    expect(validateGroup("x".repeat(49), "").valid).toBe(false);
    expect(validateGroup("Gezi", "x".repeat(141)).valid).toBe(false);
  });
});

describe("local community data", () => {
  it("loads only well-formed posts and ignores stored markup as text data", () => {
    const stored = JSON.stringify([
      {
        id: "post-1",
        content: "<script>alert(1)</script>",
        category: "Fikir",
        createdAt: "2026-10-28T12:00:00.000Z",
        likes: 0,
        liked: false,
      },
      { id: "invalid", content: "", category: "other" },
    ]);

    expect(parsePosts(stored)).toHaveLength(1);
    expect(parsePosts(stored)[0].content).toContain("<script>");
  });

  it("rejects malformed stored JSON and accepts an empty collection", () => {
    expect(parsePosts(null)).toEqual([]);
    expect(() => parsePosts("{")).toThrow();
    expect(parseGroups("[]")).toEqual([]);
  });
});
