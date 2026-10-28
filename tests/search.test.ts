import { describe, expect, it } from "vitest";
import { filterCourses, filterStaff } from "../src/search";

const staff = [
  {
    name: "Doç. Dr. Merdin DANIŞMAZ",
    department: "Termodinamik ve Isı Tekniği",
    title: "Doç. Dr.",
    initials: "MD",
  },
  {
    name: "Dr. Öğr. Üyesi Zeynep EKİCİOĞLU KÜZECİ",
    department: "Makine Teorisi ve Sistem Dinamiği",
    title: "Dr. Öğr. Üyesi",
    initials: "ZK",
  },
  {
    name: "Prof. Dr. Levent URTEKİN",
    department: "Konstrüksiyon ve İmalat",
    title: "Prof. Dr.",
    initials: "LÜ",
  },
];

const courses = [
  { code: "252721102", name: "Termodinamik-I" },
  { code: "252731105", name: "Isı Transferi" },
];

describe("filterStaff", () => {
  it("finds staff by Turkish case-insensitive name or department", () => {
    expect(filterStaff(staff, { query: "zeynep ekİCİoğlu" })).toEqual([
      staff[1],
    ]);
    expect(filterStaff(staff, { query: "ISI TEKNİĞİ" })).toEqual([staff[0]]);
  });

  it("combines a department filter with search and ignores surrounding spaces", () => {
    expect(
      filterStaff(staff, {
        department: "Konstrüksiyon ve İmalat",
        query: "  LEVENT ",
      }),
    ).toEqual([staff[2]]);
  });

  it("returns no entries when no query matches", () => {
    expect(filterStaff(staff, { query: "bulunmayan kişi" })).toEqual([]);
  });
});

describe("filterCourses", () => {
  it("searches course names with Turkish casing", () => {
    expect(filterCourses(courses, "ISI TRANSFERI")).toEqual([courses[1]]);
    expect(filterCourses(courses, "TERMODİNAMİK")).toEqual([courses[0]]);
  });

  it("returns the full list for a blank query", () => {
    expect(filterCourses(courses, "   ")).toEqual(courses);
  });
});
