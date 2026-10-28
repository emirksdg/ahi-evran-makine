import type { Course, StaffFilters, StaffMember } from "./types";

function normalize(value: string): string {
  return value
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i");
}

export function filterStaff(
  staff: readonly StaffMember[],
  filters: StaffFilters,
): StaffMember[] {
  const query = normalize(filters.query);
  const department = filters.department ?? "";

  return staff.filter((person) => {
    const matchesDepartment =
      department === "" || person.department === department;
    const searchableText = normalize(
      `${person.name} ${person.title} ${person.department}`,
    );

    return matchesDepartment && (query === "" || searchableText.includes(query));
  });
}

export function filterCourses(
  courses: readonly Course[],
  query: string,
): Course[] {
  const normalizedQuery = normalize(query);

  return courses.filter(
    (course) =>
      normalizedQuery === "" || normalize(course.name).includes(normalizedQuery),
  );
}
