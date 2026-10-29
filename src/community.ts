export type PostCategory = "Fikir" | "Ders" | "Kampüs";

export interface CommunityPost {
  id: string;
  content: string;
  category: PostCategory;
  createdAt: string;
  likes: number;
  liked: boolean;
  example?: boolean;
}

export interface StudentGroup {
  id: string;
  name: string;
  description: string;
}

export const maxPostLength = 500;
export const maxGroupNameLength = 48;
export const maxGroupDescriptionLength = 140;

export function isPostCategory(value: string): value is PostCategory {
  return value === "Fikir" || value === "Ders" || value === "Kampüs";
}

export function validatePostContent(
  value: string,
): { valid: true; value: string } | { valid: false; reason: string } {
  const content = value.trim();
  if (!content) {
    return { valid: false, reason: "Paylaşım metni boş olamaz." };
  }
  if (content.length > maxPostLength) {
    return {
      valid: false,
      reason: `Paylaşım en fazla ${maxPostLength} karakter olabilir.`,
    };
  }
  return { valid: true, value: content };
}

export function validateGroup(
  nameValue: string,
  descriptionValue: string,
): { valid: true; name: string; description: string } | { valid: false; reason: string } {
  const name = nameValue.trim();
  const description = descriptionValue.trim();
  if (!name) {
    return { valid: false, reason: "Topluluk adı boş olamaz." };
  }
  if (name.length > maxGroupNameLength) {
    return {
      valid: false,
      reason: `Topluluk adı en fazla ${maxGroupNameLength} karakter olabilir.`,
    };
  }
  if (description.length > maxGroupDescriptionLength) {
    return {
      valid: false,
      reason: `Açıklama en fazla ${maxGroupDescriptionLength} karakter olabilir.`,
    };
  }
  return { valid: true, name, description };
}

export function parsePosts(value: string | null): CommunityPost[] {
  if (value === null) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("Kaydedilmiş paylaşımlar okunamadı.");
  }

  return parsed.filter((post: unknown): post is CommunityPost => {
    if (typeof post !== "object" || post === null) return false;
    const candidate = post as Partial<CommunityPost>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.content === "string" &&
      candidate.content.length > 0 &&
      candidate.content.length <= maxPostLength &&
      isPostCategory(candidate.category ?? "") &&
      typeof candidate.createdAt === "string" &&
      Number.isFinite(Date.parse(candidate.createdAt)) &&
      typeof candidate.likes === "number" &&
      Number.isInteger(candidate.likes) &&
      candidate.likes >= 0 &&
      typeof candidate.liked === "boolean"
    );
  });
}

export function parseGroups(value: string | null): StudentGroup[] {
  if (value === null) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("Kaydedilmiş topluluklar okunamadı.");
  }

  return parsed.filter((group: unknown): group is StudentGroup => {
    if (typeof group !== "object" || group === null) return false;
    const candidate = group as Partial<StudentGroup>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      candidate.name.length > 0 &&
      candidate.name.length <= maxGroupNameLength &&
      typeof candidate.description === "string" &&
      candidate.description.length <= maxGroupDescriptionLength
    );
  });
}
