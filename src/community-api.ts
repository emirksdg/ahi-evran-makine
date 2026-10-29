import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export interface StudentProfile extends ProfileRow {
  avatar_url: string | null;
}

export interface FeedPost extends PostRow {
  author: Pick<ProfileRow, "id" | "display_name" | "department"> & {
    avatar_url: string | null;
  };
  liked: boolean;
}

export interface StudentGroup extends GroupRow {
  joined: boolean;
}

export interface GroupMessage extends MessageRow {
  author: Pick<ProfileRow, "id" | "display_name" | "department"> & {
    avatar_url: string | null;
  };
}

function client() {
  if (!supabase) {
    throw new Error(
      "Topluluk hizmeti henüz bağlanmadı. Supabase kurulumu tamamlandığında burada hesap açabileceksin.",
    );
  }
  return supabase;
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
  department: string;
}) {
  const { data, error } = await client().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      data: {
        display_name: input.displayName.trim(),
        department: input.department.trim(),
      },
    },
  });
  throwIfError(error);
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await client().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  throwIfError(error);
  return data;
}

export async function signOut() {
  const { error } = await client().auth.signOut();
  throwIfError(error);
}

export async function currentUser(): Promise<User | null> {
  const { data, error } = await client().auth.getSession();
  throwIfError(error);
  return data.session?.user ?? null;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${window.location.pathname}`,
  });
  throwIfError(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await client().auth.updateUser({ password });
  throwIfError(error);
}

async function signedAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client()
    .storage.from("student-avatars")
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function loadProfile(userId: string): Promise<StudentProfile> {
  const { data, error } = await client()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return { ...data, avatar_url: await signedAvatarUrl(data.avatar_path) };
}

export async function updateProfile(input: {
  userId: string;
  displayName: string;
  department: string;
  avatarFile?: File;
  previousAvatarPath: string | null;
}): Promise<StudentProfile> {
  const db = client();
  let newAvatarPath: string | null = null;

  if (input.avatarFile) {
    const allowedTypes = new Map([
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
    ]);
    const extension = allowedTypes.get(input.avatarFile.type);
    if (!extension) {
      throw new Error("Fotoğraf JPG, PNG veya WebP biçiminde olmalı.");
    }
    if (input.avatarFile.size > 5 * 1024 * 1024) {
      throw new Error("Profil fotoğrafı en fazla 5 MB olabilir.");
    }

    newAvatarPath = `${input.userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from("student-avatars")
      .upload(newAvatarPath, input.avatarFile, {
        contentType: input.avatarFile.type,
        upsert: false,
      });
    throwIfError(uploadError);
  }

  const { data, error } = await db
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      department: input.department.trim(),
      ...(newAvatarPath ? { avatar_path: newAvatarPath } : {}),
    })
    .eq("id", input.userId)
    .select("*")
    .single();

  if (error) {
    if (newAvatarPath) {
      await db.storage.from("student-avatars").remove([newAvatarPath]);
    }
    throw new Error(error.message);
  }

  if (
    newAvatarPath &&
    input.previousAvatarPath &&
    input.previousAvatarPath !== newAvatarPath
  ) {
    const { error: removeError } = await db.storage
      .from("student-avatars")
      .remove([input.previousAvatarPath]);
    if (removeError) {
      console.error("Eski profil fotoğrafı silinemedi:", removeError.message);
    }
  }
  return { ...data, avatar_url: await signedAvatarUrl(data.avatar_path) };
}

export async function loadPosts(userId: string): Promise<FeedPost[]> {
  const db = client();
  const { data: postRows, error: postError } = await db
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (postError) throw new Error(postError.message);
  const posts = postRows satisfies PostRow[];
  if (posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((post) => post.author_id))];
  const postIds = posts.map((post) => post.id);
  const [profilesResult, likesResult] = await Promise.all([
    db.from("profiles").select("*").in("id", authorIds),
    db
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (likesResult.error) throw new Error(likesResult.error.message);

  const likedIds = new Set(likesResult.data.map((like) => like.post_id));
  const profileById = new Map(
    profilesResult.data.map((profile) => [profile.id, profile]),
  );
  const avatarUrls = new Map<string, string | null>();
  await Promise.all(
    profilesResult.data.map(async (profile) => {
      avatarUrls.set(profile.id, await signedAvatarUrl(profile.avatar_path));
    }),
  );

  return posts.flatMap((post) => {
    const author = profileById.get(post.author_id);
    if (!author) return [];
    return [
      {
        ...post,
        author: {
          id: author.id,
          display_name: author.display_name,
          department: author.department,
          avatar_url: avatarUrls.get(author.id) ?? null,
        },
        liked: likedIds.has(post.id),
      },
    ];
  });
}

export async function createPost(input: {
  userId: string;
  content: string;
  category: "Fikir" | "Ders" | "Kampüs";
}): Promise<void> {
  const { error } = await client().from("posts").insert({
    author_id: input.userId,
    content: input.content,
    category: input.category,
  });
  throwIfError(error);
}

export async function togglePostLike(input: {
  userId: string;
  postId: string;
  liked: boolean;
}): Promise<void> {
  const db = client();
  if (input.liked) {
    const { error } = await db
      .from("post_likes")
      .delete()
      .eq("user_id", input.userId)
      .eq("post_id", input.postId);
    throwIfError(error);
    return;
  }
  const { error } = await db.from("post_likes").insert({
    user_id: input.userId,
    post_id: input.postId,
  });
  throwIfError(error);
}

export async function loadGroups(userId: string): Promise<StudentGroup[]> {
  const db = client();
  const [groupsResult, membershipsResult] = await Promise.all([
    db.from("groups").select("*").order("created_at", { ascending: false }),
    db.from("group_members").select("group_id").eq("user_id", userId),
  ]);
  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  const joinedIds = new Set(
    membershipsResult.data.map((membership) => membership.group_id),
  );
  return groupsResult.data.map((group) => ({
    ...group,
    joined: joinedIds.has(group.id),
  }));
}

export async function createGroup(input: {
  ownerId: string;
  name: string;
  description: string;
}): Promise<void> {
  const { error } = await client().from("groups").insert({
    owner_id: input.ownerId,
    name: input.name,
    description: input.description,
  });
  throwIfError(error);
}

export async function joinGroup(input: {
  userId: string;
  groupId: string;
}): Promise<void> {
  const { error } = await client().from("group_members").insert({
    user_id: input.userId,
    group_id: input.groupId,
  });
  throwIfError(error);
}

export async function loadMessages(groupId: string): Promise<GroupMessage[]> {
  const db = client();
  const { data: messages, error } = await db
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const orderedMessages = [...messages].reverse();
  if (orderedMessages.length === 0) return [];

  const authorIds = [...new Set(orderedMessages.map((message) => message.author_id))];
  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("*")
    .in("id", authorIds);
  if (profileError) throw new Error(profileError.message);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const avatarUrls = new Map<string, string | null>();
  await Promise.all(
    profiles.map(async (profile) => {
      avatarUrls.set(profile.id, await signedAvatarUrl(profile.avatar_path));
    }),
  );

  return orderedMessages.flatMap((message) => {
    const author = profileById.get(message.author_id);
    if (!author) return [];
    return [
      {
        ...message,
        author: {
          id: author.id,
          display_name: author.display_name,
          department: author.department,
          avatar_url: avatarUrls.get(author.id) ?? null,
        },
      },
    ];
  });
}

export async function sendMessage(input: {
  userId: string;
  groupId: string;
  content: string;
}): Promise<void> {
  const { error } = await client().from("messages").insert({
    group_id: input.groupId,
    author_id: input.userId,
    content: input.content,
  });
  throwIfError(error);
}

export function watchCommunity(onChange: () => void): () => void {
  const db = client();
  const channel = db
    .channel("community-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "groups" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles" },
      onChange,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}

export function watchGroupMessages(
  groupId: string,
  onChange: () => void,
): () => void {
  const db = client();
  const channel = db
    .channel(`group-messages:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `group_id=eq.${groupId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}
