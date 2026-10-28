import {
  courses,
  staff,
} from "./data";
import { filterCourses, filterStaff } from "./search";
import type { Course, StaffMember } from "./types";
import "./style.css";

function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  return node;
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Sayfa bileşeni bulunamadı: ${selector}`);
  return node;
}

function createStaffCard(person: StaffMember): HTMLElement {
  const card = element("article", "staff-card");
  const avatar = element("span", "staff-card__avatar");
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = person.initials;

  const content = element("div", "staff-card__content");
  const title = element("p", "staff-card__title");
  title.textContent = person.title;
  const name = element("h3", "staff-card__name");
  name.textContent = person.name;
  const department = element("p", "staff-card__department");
  department.textContent = person.department;

  content.append(title, name, department);
  card.append(avatar, content);
  return card;
}

function createCourseCard(course: Course, index: number): HTMLElement {
  const card = element("article", "course-card");
  const number = element("span", "course-card__number");
  number.textContent = String(index + 1).padStart(2, "0");
  const name = element("h3", "course-card__name");
  name.textContent = course.name;
  const label = element("p", "course-card__label");
  label.textContent = "2025–2026 · Bahar";

  card.append(number, name, label);
  return card;
}

const staffGrid = requiredElement<HTMLElement>("#staff-grid");
const staffSearch = requiredElement<HTMLInputElement>("#staff-search");
const departmentFilter = requiredElement<HTMLSelectElement>(
  "#department-filter",
);
const staffCount = requiredElement<HTMLElement>("#staff-count");
const staffEmpty = requiredElement<HTMLElement>("#staff-empty");
const courseGrid = requiredElement<HTMLElement>("#course-grid");
const courseSearch = requiredElement<HTMLInputElement>("#course-search");
const courseCount = requiredElement<HTMLElement>("#course-count");
const courseEmpty = requiredElement<HTMLElement>("#course-empty");
const staffStat = requiredElement<HTMLElement>("#staff-stat");
const courseStat = requiredElement<HTMLElement>("#course-stat");

const departments = [...new Set(staff.map((person) => person.department))].sort(
  (first, second) => first.localeCompare(second, "tr-TR"),
);
for (const department of departments) {
  const option = element("option");
  option.value = department;
  option.textContent = department;
  departmentFilter.append(option);
}

staffStat.textContent = String(staff.length).padStart(2, "0");
courseStat.textContent = String(courses.length).padStart(2, "0");

function renderStaff(): void {
  const filteredStaff = filterStaff(staff, {
    query: staffSearch.value,
    department: departmentFilter.value,
  });
  staffGrid.replaceChildren(
    ...filteredStaff.map((person) => createStaffCard(person)),
  );
  staffCount.textContent = `${filteredStaff.length} akademisyen gösteriliyor`;
  staffEmpty.hidden = filteredStaff.length > 0;
  staffGrid.hidden = filteredStaff.length === 0;
}

function renderCourses(): void {
  const filteredCourses = filterCourses(courses, courseSearch.value);
  courseGrid.replaceChildren(
    ...filteredCourses.map((course, index) => createCourseCard(course, index)),
  );
  courseCount.textContent = `${filteredCourses.length} ders gösteriliyor`;
  courseEmpty.hidden = filteredCourses.length > 0;
  courseGrid.hidden = filteredCourses.length === 0;
}

staffSearch.addEventListener("input", renderStaff);
departmentFilter.addEventListener("change", renderStaff);
courseSearch.addEventListener("input", renderCourses);

renderStaff();
renderCourses();

const footerYear = document.querySelector<HTMLElement>("#current-year");
if (footerYear) footerYear.textContent = String(new Date().getFullYear());
