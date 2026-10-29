import {
  bolognaSource,
  courses,
  staff,
  yokAcademicSearchSource,
} from "./data";
import {
  isPostCategory,
  parseGroups,
  parsePosts,
  validateGroup,
  validatePostContent,
  type CommunityPost,
  type PostCategory,
  type StudentGroup,
} from "./community";
import { isSupabaseConfigured } from "./supabase";
import { initializeSocialCommunity } from "./social";
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
  const card = element("a", "staff-card");
  card.href = yokAcademicSearchSource;
  card.target = "_blank";
  card.rel = "noreferrer";
  card.setAttribute(
    "aria-label",
    `${person.name}, ${person.title}, ${person.department}. YÖK Akademik sayfasını aç (yeni sekmede açılır)`,
  );
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
  const linkLabel = element("span", "staff-card__link");
  linkLabel.textContent = "YÖK Akademik ↗";

  content.append(title, name, department, linkLabel);
  card.append(avatar, content);
  return card;
}

function createCourseCard(course: Course, index: number): HTMLElement {
  const card = element("button", "course-card");
  card.type = "button";
  card.addEventListener("click", () => {
    courseDialogName.textContent = course.name;
    courseDialog.showModal();
  });
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
const courseDialog = requiredElement<HTMLDialogElement>("#course-dialog");
const courseDialogName = requiredElement<HTMLElement>("#course-dialog-name");
const courseDialogClose = requiredElement<HTMLButtonElement>(
  "#course-dialog-close",
);
const courseDialogLink = requiredElement<HTMLAnchorElement>(
  "#course-dialog-link",
);
const communityFeed = requiredElement<HTMLElement>("#community-feed");
const communityStatus = requiredElement<HTMLElement>("#community-status");
const feedEmpty = requiredElement<HTMLElement>("#feed-empty");
const postForm = requiredElement<HTMLFormElement>("#post-form");
const postContent = requiredElement<HTMLTextAreaElement>("#post-content");
const postCategory = requiredElement<HTMLSelectElement>("#post-category");
const postCounter = requiredElement<HTMLElement>("#post-counter");
const groupList = requiredElement<HTMLElement>("#group-list");
const groupDialog = requiredElement<HTMLDialogElement>("#group-dialog");
const groupForm = requiredElement<HTMLFormElement>("#group-form");
const groupName = requiredElement<HTMLInputElement>("#group-name");
const groupDescription =
  requiredElement<HTMLTextAreaElement>("#group-description");
const groupFormStatus = requiredElement<HTMLElement>("#group-form-status");
const accountDialog = requiredElement<HTMLDialogElement>("#account-dialog");
courseDialogLink.href = bolognaSource;
courseDialogClose.addEventListener("click", () => courseDialog.close());

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

if (isSupabaseConfigured) {
  initializeSocialCommunity();
} else {
const accountMessage = requiredElement<HTMLElement>(
  "#community-account-message",
);
accountMessage.textContent =
  "Bu sayfa şu an yalnızca yerel önizleme. Gerçek kayıt ve cihazlar arası eşitleme için Supabase ayarları henüz eklenmedi. Bu bölümde gerçek e-posta veya şifre kullanma.";

const authForm = requiredElement<HTMLFormElement>("#account-form");
authForm
  .querySelectorAll<HTMLInputElement>("input")
  .forEach((input) => (input.disabled = true));
requiredElement<HTMLButtonElement>("#auth-submit").disabled = true;
requiredElement<HTMLButtonElement>("#auth-forgot-button").disabled = true;
requiredElement<HTMLButtonElement>("#account-dialog-close").addEventListener(
  "click",
  () => accountDialog.close(),
);

document
  .querySelectorAll<HTMLButtonElement>("[data-auth-mode]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const registering = button.dataset.authMode === "register";
      requiredElement<HTMLElement>("#auth-register-fields").hidden =
        !registering;
      requiredElement<HTMLElement>("#account-dialog-title").textContent =
        registering ? "Aramıza katıl." : "Tekrar hoş geldin.";
      requiredElement<HTMLElement>("#account-mode-description").textContent =
        "Hesap hizmeti henüz kurulmadı. Lütfen daha sonra tekrar dene.";
      document
        .querySelectorAll<HTMLButtonElement>("[data-auth-mode]")
        .forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
    });
  });

const postsStorageKey = "ahi-evran-community-posts";
const groupsStorageKey = "ahi-evran-community-groups";
const examplePosts: CommunityPost[] = [
  {
    id: "example-idea",
    content:
      "Atölye projelerinde kullanılabilecek küçük bir fikir: bölümdeki ortak ekipmanlar için basit bir ödünç alma takvimi oluştursak işimizi kolaylaştırır mı?",
    category: "Fikir",
    createdAt: "2026-10-28T12:00:00.000Z",
    likes: 8,
    liked: false,
    example: true,
  },
  {
    id: "example-study",
    content:
      "Termodinamik çalışırken konu özetlerini birlikte toparlayabileceğimiz bir çalışma grubu arıyorum. Katılmak isteyen var mı?",
    category: "Ders",
    createdAt: "2026-10-27T12:00:00.000Z",
    likes: 5,
    liked: false,
    example: true,
  },
];
const exampleGroups: StudentGroup[] = [
  {
    id: "design-workshop",
    name: "Tasarım ve Üretim",
    description: "Proje fikirleri, CAD ve atölye üzerine.",
  },
  {
    id: "study-table",
    name: "Ders Çalışma Masası",
    description: "Birlikte tekrar, not paylaşımı ve soru çözümü.",
  },
  {
    id: "campus-life",
    name: "Kampüs Yaşamı",
    description: "Etkinlikler ve kampüsten haberler.",
  },
];
let communityPosts: CommunityPost[] = [];
let studentGroups: StudentGroup[] = [];
let activeFeedFilter = "Tümü";

function showCommunityStatus(message: string): void {
  communityStatus.textContent = message;
}

function loadLocalCollection<T>(
  key: string,
  parse: (value: string | null) => T[],
  label: string,
): T[] {
  try {
    return parse(window.localStorage.getItem(key));
  } catch {
    showCommunityStatus(
      `${label} bu tarayıcıdan okunamadı. Önizlemeyi kullanabilirsin; veriler kaydedilmeyebilir.`,
    );
    return [];
  }
}

function saveLocalCollection<T>(
  key: string,
  value: T[],
  label: string,
): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showCommunityStatus(
      `${label} bu tarayıcıya kaydedilemedi. Bu önizlemede veriler yalnızca sayfa açıkken görünür.`,
    );
    return false;
  }
}

function createFeedCard(post: CommunityPost): HTMLElement {
  const card = element("article", "feed-card");
  const header = element("div", "feed-card__header");
  const avatar = element("span", "avatar");
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = post.example ? "K" : "S";

  const identity = element("div", "feed-card__identity");
  const name = element("p", "feed-card__name");
  name.textContent = post.example ? "Kampüsten bir öğrenci" : "Bu cihazdan sen";
  const meta = element("p", "feed-card__meta");
  meta.textContent = post.example
    ? "Örnek paylaşım"
    : new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(post.createdAt));
  identity.append(name, meta);

  const tag = element("span", "feed-card__tag");
  tag.textContent = post.category;
  header.append(avatar, identity, tag);

  const body = element("p", "feed-card__body");
  body.textContent = post.content;

  const footer = element("div", "feed-card__footer");
  const like = element("button", "feed-like");
  like.type = "button";
  like.setAttribute("aria-pressed", String(post.liked));
  like.setAttribute(
    "aria-label",
    post.liked ? `Beğeniyi geri al, ${post.likes} beğeni` : `Beğen, ${post.likes} beğeni`,
  );
  like.textContent = `${post.liked ? "♥" : "♡"}  ${post.likes} beğeni`;
  like.addEventListener("click", () => {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    if (!post.example) {
      saveLocalCollection(postsStorageKey, communityPosts, "Paylaşımlar");
    }
    renderFeed();
  });
  footer.append(like);
  card.append(header, body, footer);
  return card;
}

function renderFeed(): void {
  const allPosts = [...communityPosts, ...examplePosts]
    .filter(
      (post) =>
        activeFeedFilter === "Tümü" || post.category === activeFeedFilter,
    )
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
  communityFeed.replaceChildren(...allPosts.map(createFeedCard));
  communityFeed.hidden = allPosts.length === 0;
  feedEmpty.hidden = allPosts.length > 0;
}

function createGroupCard(group: StudentGroup): HTMLElement {
  const card = element("article", "group-card");
  const mark = element("span", "group-card__mark");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = group.name.slice(0, 1).toLocaleUpperCase("tr-TR");
  const copy = element("div", "group-card__copy");
  const name = element("p", "group-card__name");
  name.textContent = group.name;
  const description = element("p", "group-card__description");
  description.textContent = group.description || "Yeni bir öğrenci topluluğu.";
  copy.append(name, description);
  card.append(mark, copy);
  return card;
}

function renderGroups(): void {
  groupList.replaceChildren(
    ...[...studentGroups, ...exampleGroups].map(createGroupCard),
  );
}

communityPosts = loadLocalCollection(
  postsStorageKey,
  parsePosts,
  "Paylaşımlar",
);
studentGroups = loadLocalCollection(groupsStorageKey, parseGroups, "Topluluklar");
renderFeed();
renderGroups();

postContent.addEventListener("input", () => {
  postCounter.textContent = `${postContent.value.length} / 500`;
});
postForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validatePostContent(postContent.value);
  if (!result.valid) {
    showCommunityStatus(result.reason);
    return;
  }
  if (!isPostCategory(postCategory.value)) {
    showCommunityStatus("Bir paylaşım konusu seç.");
    return;
  }
  const post: CommunityPost = {
    id: window.crypto.randomUUID(),
    content: result.value,
    category: postCategory.value as PostCategory,
    createdAt: new Date().toISOString(),
    likes: 0,
    liked: false,
  };
  communityPosts.unshift(post);
  saveLocalCollection(postsStorageKey, communityPosts, "Paylaşım");
  activeFeedFilter = "Tümü";
  document
    .querySelectorAll<HTMLButtonElement>("[data-feed-filter]")
    .forEach((button) => {
      const active = button.dataset.feedFilter === activeFeedFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  postForm.reset();
  postCounter.textContent = "0 / 500";
  showCommunityStatus(
    "Paylaşım bu tarayıcıda eklendi. Henüz diğer öğrencilerle paylaşılmıyor.",
  );
  renderFeed();
});

document
  .querySelectorAll<HTMLButtonElement>("[data-feed-filter]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      activeFeedFilter = button.dataset.feedFilter ?? "Tümü";
      document
        .querySelectorAll<HTMLButtonElement>("[data-feed-filter]")
        .forEach((filterButton) => {
          const active = filterButton === button;
          filterButton.classList.toggle("is-active", active);
          filterButton.setAttribute("aria-pressed", String(active));
        });
      renderFeed();
    });
  });

requiredElement<HTMLButtonElement>("#create-group-button").addEventListener(
  "click",
  () => {
    groupFormStatus.textContent = "";
    groupDialog.showModal();
    groupName.focus();
  },
);
requiredElement<HTMLButtonElement>("#group-dialog-close").addEventListener(
  "click",
  () => groupDialog.close(),
);
groupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateGroup(groupName.value, groupDescription.value);
  if (!result.valid) {
    groupFormStatus.textContent = result.reason;
    return;
  }
  const existingNames = [...studentGroups, ...exampleGroups].map((group) =>
    group.name.toLocaleLowerCase("tr-TR"),
  );
  if (existingNames.includes(result.name.toLocaleLowerCase("tr-TR"))) {
    groupFormStatus.textContent = "Bu isimde bir topluluk zaten var.";
    return;
  }
  studentGroups.unshift({
    id: window.crypto.randomUUID(),
    name: result.name,
    description: result.description,
  });
  saveLocalCollection(groupsStorageKey, studentGroups, "Topluluk");
  groupForm.reset();
  groupDialog.close();
  showCommunityStatus(
    "Topluluk bu tarayıcıda oluşturuldu. Henüz diğer öğrenciler tarafından görülemiyor.",
  );
  renderGroups();
});

requiredElement<HTMLButtonElement>("#login-button").addEventListener(
  "click",
  () => accountDialog.showModal(),
);
}

staffSearch.addEventListener("input", renderStaff);
departmentFilter.addEventListener("change", renderStaff);
courseSearch.addEventListener("input", renderCourses);

renderStaff();
renderCourses();

const footerYear = document.querySelector<HTMLElement>("#current-year");
if (footerYear) footerYear.textContent = String(new Date().getFullYear());
