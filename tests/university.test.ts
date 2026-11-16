import { describe, expect, it } from "vitest";
import { matchesUniversityEmail } from "../src/university";

describe("matchesUniversityEmail", () => {
  it("accepts an exact university domain and its subdomains", () => {
    expect(matchesUniversityEmail("student@uni.edu.tr", ["uni.edu.tr"])).toBe(
      true,
    );
    expect(
      matchesUniversityEmail(" Student@ogr.Uni.edu.tr ", ["uni.edu.tr"]),
    ).toBe(true);
  });

  it("rejects personal mail, lookalike domains, and malformed addresses", () => {
    expect(matchesUniversityEmail("student@gmail.com", ["uni.edu.tr"])).toBe(
      false,
    );
    expect(
      matchesUniversityEmail("student@notuni.edu.tr", ["uni.edu.tr"]),
    ).toBe(false);
    expect(matchesUniversityEmail("student@", ["uni.edu.tr"])).toBe(false);
    expect(matchesUniversityEmail("student", ["uni.edu.tr"])).toBe(false);
    expect(matchesUniversityEmail("student@uni.edu.tr", [])).toBe(false);
  });

  it("normalizes domains and ignores filler whitespace in allowed values", () => {
    expect(
      matchesUniversityEmail("student@SUB.UNI.EDU.TR", ["  uni.edu.tr  "]),
    ).toBe(true);
    expect(
      matchesUniversityEmail("student@uni.edu.tr", [".uni.edu.tr."]),
    ).toBe(true);
    expect(matchesUniversityEmail("student@uni.edu.tr", ["   "])).toBe(false);
  });
});
