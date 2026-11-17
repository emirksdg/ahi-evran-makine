import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Database } from "./database.types";
import { createMessageSearchPattern } from "./community";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type PostCommentRow = Database["public"]["Tables"]["post_comments"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type GroupJoinRequestRow =
  Database["public"]["Tables"]["group_join_requests"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type UserBlockRow = Database["public"]["Tables"]["user_blocks"]["Row"];
export type GroupJoinRequestStatus = GroupJoinRequestRow["status"];
export type NotificationType = NotificationRow["type"];
export type ReportTargetType = "post" | "comment" | "message" | "group";
export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "privacy"
  | "other";
export type ContentReport =
  Database["public"]["Tables"]["content_reports"]["Row"];
export type FeedbackCategory = "design" | "feature" | "issue" | "other";
export type SiteFeedback =
  Database["public"]["Tables"]["site_feedback"]["Row"];

export interface PostComment extends PostCommentRow {
  author: Pick<ProfileRow, "id" | "display_name" | "department"> & {
    avatar_url: string | null;
  };
}

export interface StudentProfile extends ProfileRow {
  avatar_url: string | null;
}

export interface FeedPost extends PostRow {
  author: Pick<ProfileRow, "id" | "display_name" | "department"> & {
    avatar_url: string | null;
  };
  liked: boolean;
}

export type ProfileIdea = Pick<
  PostRow,
  "id" | "content" | "category" | "is_hidden" | "created_at"
>;

export interface StudentGroup extends GroupRow {
  joined: boolean;
  joinRequestStatus: GroupJoinRequestStatus | null;
  pendingJoinRequestCount: number;
  ownerName: string;
  memberCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface GroupJoinRequest extends GroupJoinRequestRow {
  requester: Pick<ProfileRow, "id" | "display_name" | "department">;
}

export interface GroupMember {
  user_id: string;
  joined_at: string;
  display_name: string;
  department: string;
}

export type UserNotification = NotificationRow;

export interface BlockedUser
  extends Pick<ProfileRow, "id" | "display_name" | "department"> {
  blockedAt: UserBlockRow["created_at"];
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
  bio: string;
  universityName: string;
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
      bio: input.bio.trim() || null,
      university_name: input.universityName.trim() || null,
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

export async function loadProfileIdeas(userId: string): Promise<ProfileIdea[]> {
  const { data, error } = await client()
    .from("posts")
    .select("id, content, category, is_hidden, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data;
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

export async function deletePost(input: {
  postId: string;
  userId: string;
}): Promise<void> {
  const { data, error } = await client()
    .from("posts")
    .delete()
    .eq("id", input.postId)
    .eq("author_id", input.userId)
    .select("id")
    .maybeSingle();
  throwIfError(error);
  if (!data) throw new Error("Fikir silinemedi. Yalnızca kendi fikirlerini silebilirsin.");
}

export async function isModerator(): Promise<boolean> {
  const { data, error } = await client().rpc("is_moderator");
  if (error) throw new Error(error.message);
  return data;
}

export async function submitContentReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
}): Promise<void> {
  const { error } = await client().rpc("submit_content_report", {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_details: input.details,
  });
  throwIfError(error);
}

export async function loadContentReports(): Promise<ContentReport[]> {
  const { data, error } = await client()
    .from("content_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data;
}

export async function moderateContentReport(input: {
  reportId: string;
  decision: "hide" | "restore" | "dismiss";
}): Promise<void> {
  const { error } = await client().rpc("moderate_content_report", {
    p_report_id: input.reportId,
    p_decision: input.decision,
  });
  throwIfError(error);
}

export async function submitSiteFeedback(input: {
  category: FeedbackCategory;
  message: string;
}): Promise<void> {
  const { error } = await client().rpc("submit_site_feedback", {
    p_category: input.category,
    p_message: input.message,
  });
  throwIfError(error);
}

export async function loadSiteFeedback(): Promise<SiteFeedback[]> {
  const { data, error } = await client()
    .from("site_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data;
}

export async function markSiteFeedbackReviewed(
  feedbackId: string,
): Promise<void> {
  const { error } = await client().rpc("mark_site_feedback_reviewed", {
    p_feedback_id: feedbackId,
  });
  throwIfError(error);
}

export async function loadPostComments(postId: string): Promise<PostComment[]> {
  const db = client();
  const { data: comments, error } = await db
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  if (comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((comment) => comment.author_id))];
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

  return comments.flatMap((comment) => {
    const author = profileById.get(comment.author_id);
    if (!author) return [];
    return [
      {
        ...comment,
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

export async function createPostComment(input: {
  postId: string;
  authorId: string;
  content: string;
}): Promise<void> {
  const { error } = await client().from("post_comments").insert({
    post_id: input.postId,
    author_id: input.authorId,
    content: input.content,
  });
  throwIfError(error);
}

export async function deletePostComment(input: {
  commentId: string;
  authorId: string;
}): Promise<void> {
  const { data, error } = await client()
    .from("post_comments")
    .delete()
    .eq("id", input.commentId)
    .eq("author_id", input.authorId)
    .select("id")
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error("Yorum silinemedi. Yalnızca kendi yorumlarını silebilirsin.");
  }
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
  const [groupsResult, membershipsResult, requestsResult] = await Promise.all([
    db.from("groups").select("*").order("created_at", { ascending: false }),
    db.from("group_members").select("group_id").eq("user_id", userId),
    db
      .from("group_join_requests")
      .select("group_id, requester_id, status"),
  ]);
  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (requestsResult.error) throw new Error(requestsResult.error.message);
  const summariesResult = await db.rpc("get_group_summaries", {
    target_group_ids: groupsResult.data.map((group) => group.id),
  });
  if (summariesResult.error) throw new Error(summariesResult.error.message);
  const joinedIds = new Set(
    membershipsResult.data.map((membership) => membership.group_id),
  );
  const summariesById = new Map(
    summariesResult.data.map((summary) => [summary.group_id, summary]),
  );
  const ownRequestStatus = new Map(
    requestsResult.data
      .filter((request) => request.requester_id === userId)
      .map((request) => [request.group_id, request.status]),
  );
  const pendingRequestCounts = new Map<string, number>();
  for (const request of requestsResult.data) {
    if (request.status !== "pending") continue;
    pendingRequestCounts.set(
      request.group_id,
      (pendingRequestCounts.get(request.group_id) ?? 0) + 1,
    );
  }
  return groupsResult.data.map((group) => {
    const summary = summariesById.get(group.id);
    if (!summary) {
      throw new Error("Bir topluluk bilgisi yüklenemedi. Listeyi yenile.");
    }
    return {
      ...group,
      joined: joinedIds.has(group.id),
      joinRequestStatus: ownRequestStatus.get(group.id) ?? null,
      pendingJoinRequestCount: pendingRequestCounts.get(group.id) ?? 0,
      ownerName: summary.owner_name,
      memberCount: summary.member_count,
      lastMessageAt: summary.last_message_at,
      lastMessagePreview: summary.last_message_preview,
    };
  });
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

export async function deleteGroup(input: {
  groupId: string;
  ownerId: string;
}): Promise<void> {
  const { data, error } = await client()
    .from("groups")
    .delete()
    .eq("id", input.groupId)
    .eq("owner_id", input.ownerId)
    .select("id")
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error("Topluluk silinemedi. Yalnızca oluşturan kişi silebilir.");
  }
}

export async function requestGroupJoin(groupId: string): Promise<void> {
  const { error } = await client().rpc("request_group_join", {
    target_group_id: groupId,
  });
  throwIfError(error);
}

export async function loadGroupJoinRequests(
  groupId: string,
): Promise<GroupJoinRequest[]> {
  const db = client();
  const { data: requests, error } = await db
    .from("group_join_requests")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (requests.length === 0) return [];

  const requesterIds = [...new Set(requests.map((request) => request.requester_id))];
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, display_name, department")
    .in("id", requesterIds);
  if (profilesError) throw new Error(profilesError.message);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return requests.flatMap((request) => {
    const requester = profilesById.get(request.requester_id);
    return requester ? [{ ...request, requester }] : [];
  });
}

export async function reviewGroupJoinRequest(input: {
  requestId: string;
  approve: boolean;
}): Promise<void> {
  const { error } = await client().rpc("review_group_join_request", {
    target_request_id: input.requestId,
    approve: input.approve,
  });
  throwIfError(error);
}

export async function loadGroupMembers(
  groupId: string,
): Promise<GroupMember[]> {
  const db = client();
  const { data: members, error } = await db
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (members.length === 0) return [];

  const memberIds = members.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, display_name, department")
    .in("id", memberIds);
  if (profilesError) throw new Error(profilesError.message);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return members.flatMap((member) => {
    const profile = profilesById.get(member.user_id);
    return profile
      ? [
          {
            user_id: member.user_id,
            joined_at: member.joined_at,
            display_name: profile.display_name,
            department: profile.department,
          },
        ]
      : [];
  });
}

export async function removeGroupMember(input: {
  groupId: string;
  userId: string;
}): Promise<void> {
  const { error } = await client().rpc("remove_group_member", {
    target_group_id: input.groupId,
    target_user_id: input.userId,
  });
  throwIfError(error);
}

export async function loadNotifications(
  userId: string,
): Promise<UserNotification[]> {
  const { data, error } = await client()
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data;
}

export async function loadUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const { count, error } = await client()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const { error } = await client()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId);
  throwIfError(error);
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<void> {
  const { error } = await client()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  throwIfError(error);
}

export function watchNotifications(
  userId: string,
  onChange: () => void,
): () => void {
  const db = client();
  const channel = db
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}

export async function loadBlockedUsers(
  userId: string,
): Promise<BlockedUser[]> {
  const db = client();
  const { data: blocks, error } = await db
    .from("user_blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (blocks.length === 0) return [];

  const ids = blocks.map((block) => block.blocked_id);
  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, display_name, department")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  return blocks.flatMap((block) => {
    const profile = profilesById.get(block.blocked_id);
    return profile ? [{ ...profile, blockedAt: block.created_at }] : [];
  });
}

export async function blockUser(targetUserId: string): Promise<void> {
  const { error } = await client().rpc("block_user", {
    target_user_id: targetUserId,
  });
  throwIfError(error);
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const { error } = await client().rpc("unblock_user", {
    target_user_id: targetUserId,
  });
  throwIfError(error);
}

export async function loadMessages(
  groupId: string,
  searchQuery = "",
): Promise<GroupMessage[]> {
  const db = client();
  const pattern = createMessageSearchPattern(searchQuery);
  const messageQuery = db
    .from("messages")
    .select("*")
    .eq("group_id", groupId);
  const { data: messages, error } = pattern
    ? await messageQuery
        .ilike("content", pattern)
        .order("created_at", { ascending: false })
        .limit(100)
    : await messageQuery
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

export async function deleteMessage(input: {
  messageId: string;
  groupId: string;
}): Promise<void> {
  const { data, error } = await client()
    .from("messages")
    .delete()
    .eq("id", input.messageId)
    .eq("group_id", input.groupId)
    .select("id")
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error("Mesaj silinemedi. Yalnızca kendi mesajlarını silebilirsin.");
  }
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
      { event: "*", schema: "public", table: "group_join_requests" },
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
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
      },
      onChange,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}
