import type { User } from "@supabase/supabase-js";
import {
  blockUser,
  createPostComment,
  createGroup,
  createPost,
  deleteMessage,
  deleteGroup,
  deletePost,
  deletePostComment,
  isModerator,
  loadContentReports,
  loadBlockedUsers,
  loadGroupJoinRequests,
  loadGroups,
  loadMessages,
  loadNotifications,
  loadUnreadNotificationCount,
  loadPosts,
  loadProfileIdeas,
  loadSiteFeedback,
  loadPostComments,
  loadProfile,
  moderateContentReport,
  markSiteFeedbackReviewed,
  markAllNotificationsRead,
  markNotificationRead,
  registerWithEmail,
  requestGroupJoin,
  reviewGroupJoinRequest,
  sendMessage,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  submitContentReport,
  submitSiteFeedback,
  togglePostLike,
  unblockUser,
  updatePassword,
  updateProfile,
  watchCommunity,
  watchGroupMessages,
  watchNotifications,
  type FeedPost,
  type ContentReport,
  type FeedbackCategory,
  type GroupJoinRequest,
  type GroupMessage,
  type UserNotification,
  type PostComment,
  type ReportReason,
  type ReportTargetType,
  type ProfileIdea,
  type SiteFeedback,
  type StudentGroup,
  type StudentProfile,
} from "./community-api";
import {
  filterGroups,
  isPostCategory,
  validateCommentContent,
  validateGroup,
  validatePostContent,
} from "./community";
import { supabase } from "./supabase";

function requiredElement<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Sayfa bileşeni bulunamadı: ${selector}`);
  return node;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  return node;
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "İşlem tamamlanamadı. Lütfen tekrar dene.";
  const message = error.message.toLocaleLowerCase("tr-TR");
  if (message.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (message.includes("email not confirmed")) {
    return "Önce e-postana gönderilen doğrulama bağlantısını aç.";
  }
  if (message.includes("user already registered")) {
    return "Bu e-posta adresiyle daha önce hesap açılmış. Giriş yapmayı dene.";
  }
  if (message.includes("password should be at least")) {
    return "Şifren en az 8 karakter olmalı.";
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  ) {
    return "Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.";
  }
  return error.message;
}

function isReportReason(value: string): value is ReportReason {
  return ["spam", "harassment", "inappropriate", "privacy", "other"].includes(
    value,
  );
}

function isFeedbackCategory(value: string): value is FeedbackCategory {
  return ["design", "feature", "issue", "other"].includes(value);
}

export function initializeSocialCommunity(): void {
  if (!supabase) return;

  const accountDialog = requiredElement<HTMLDialogElement>("#account-dialog");
  const accountForm = requiredElement<HTMLFormElement>("#account-form");
  const accountTitle = requiredElement<HTMLElement>("#account-dialog-title");
  const accountDescription = requiredElement<HTMLElement>(
    "#account-mode-description",
  );
  const accountStatus = requiredElement<HTMLElement>("#auth-status");
  const authEmail = requiredElement<HTMLInputElement>("#auth-email");
  const authPassword = requiredElement<HTMLInputElement>("#auth-password");
  const authSubmit = requiredElement<HTMLButtonElement>("#auth-submit");
  const authRegisterFields = requiredElement<HTMLElement>(
    "#auth-register-fields",
  );
  const authPasswordConfirmField = requiredElement<HTMLElement>(
    "#auth-password-confirm-field",
  );
  const authDisplayName =
    requiredElement<HTMLInputElement>("#auth-display-name");
  const authDepartment = requiredElement<HTMLInputElement>("#auth-department");
  const authPasswordConfirm = requiredElement<HTMLInputElement>(
    "#auth-password-confirm",
  );
  const profileDialog = requiredElement<HTMLDialogElement>("#profile-dialog");
  const profileViewDialog = requiredElement<HTMLDialogElement>(
    "#profile-view-dialog",
  );
  const profileViewAvatar =
    requiredElement<HTMLElement>("#profile-view-avatar");
  const profileViewName = requiredElement<HTMLElement>("#profile-view-name");
  const profileViewDepartment = requiredElement<HTMLElement>(
    "#profile-view-department",
  );
  const profileViewUniversity = requiredElement<HTMLElement>(
    "#profile-view-university",
  );
  const profileViewBioSection = requiredElement<HTMLElement>(
    "#profile-view-bio-section",
  );
  const profileViewBio = requiredElement<HTMLElement>("#profile-view-bio");
  const profileViewIdeas = requiredElement<HTMLElement>(
    "#profile-view-ideas",
  );
  const profileViewGroups = requiredElement<HTMLElement>(
    "#profile-view-groups",
  );
  const profileViewStatus = requiredElement<HTMLElement>(
    "#profile-view-status",
  );
  const profileForm = requiredElement<HTMLFormElement>("#profile-form");
  const profileName = requiredElement<HTMLInputElement>(
    "#profile-display-name",
  );
  const profileDepartment = requiredElement<HTMLInputElement>(
    "#profile-department",
  );
  const profileUniversity = requiredElement<HTMLInputElement>(
    "#profile-university",
  );
  const profileBio = requiredElement<HTMLTextAreaElement>("#profile-bio");
  const profileAvatar = requiredElement<HTMLInputElement>("#profile-avatar");
  const profileAvatarPreview =
    requiredElement<HTMLElement>("#profile-avatar-preview");
  const profileStatus = requiredElement<HTMLElement>("#profile-status");
  const profileSaveButton = requiredElement<HTMLButtonElement>(
    "#profile-save-button",
  );
  const signedInControls =
    requiredElement<HTMLElement>("#signed-in-controls");
  const signedInName = requiredElement<HTMLElement>("#signed-in-name");
  const notificationsButton = requiredElement<HTMLButtonElement>(
    "#notifications-button",
  );
  const notificationsUnreadCount = requiredElement<HTMLElement>(
    "#notifications-unread-count",
  );
  const notificationsDialog = requiredElement<HTMLDialogElement>(
    "#notifications-dialog",
  );
  const notificationsStatus =
    requiredElement<HTMLElement>("#notifications-status");
  const notificationsList =
    requiredElement<HTMLElement>("#notifications-list");
  const notificationsMarkAll = requiredElement<HTMLButtonElement>(
    "#notifications-mark-all",
  );
  const blockedUsersDialog = requiredElement<HTMLDialogElement>(
    "#blocked-users-dialog",
  );
  const blockedUsersButton = requiredElement<HTMLButtonElement>(
    "#blocked-users-button",
  );
  const blockedUsersStatus =
    requiredElement<HTMLElement>("#blocked-users-status");
  const blockedUsersList = requiredElement<HTMLElement>(
    "#blocked-users-list",
  );
  const loginButton = requiredElement<HTMLButtonElement>("#login-button");
  const communityMessage = requiredElement<HTMLElement>(
    "#community-account-message",
  );
  const communityFeed = requiredElement<HTMLElement>("#community-feed");
  const feedEmpty = requiredElement<HTMLElement>("#feed-empty");
  const communityStatus = requiredElement<HTMLElement>("#community-status");
  const postForm = requiredElement<HTMLFormElement>("#post-form");
  const postContent = requiredElement<HTMLTextAreaElement>("#post-content");
  const postCategory = requiredElement<HTMLSelectElement>("#post-category");
  const postCounter = requiredElement<HTMLElement>("#post-counter");
  const groupForm = requiredElement<HTMLFormElement>("#group-form");
  const groupNameInput = requiredElement<HTMLInputElement>("#group-name");
  const groupDescriptionInput =
    requiredElement<HTMLTextAreaElement>("#group-description");
  const groupFormStatus = requiredElement<HTMLElement>("#group-form-status");
  const groupDialog = requiredElement<HTMLDialogElement>("#group-dialog");
  const groupList = requiredElement<HTMLElement>("#group-list");
  const groupSearchInput = requiredElement<HTMLInputElement>("#group-search");
  const groupRequestsDialog = requiredElement<HTMLDialogElement>(
    "#group-requests-dialog",
  );
  const groupRequestsTitle = requiredElement<HTMLElement>(
    "#group-requests-title",
  );
  const groupRequestsStatus = requiredElement<HTMLElement>(
    "#group-requests-status",
  );
  const groupRequestsList = requiredElement<HTMLElement>(
    "#group-requests-list",
  );
  const groupChatDialog =
    requiredElement<HTMLDialogElement>("#group-chat-dialog");
  const groupChatTitle = requiredElement<HTMLElement>("#group-chat-title");
  const groupChatId = requiredElement<HTMLElement>("#group-chat-id");
  const groupChatCopyId = requiredElement<HTMLButtonElement>(
    "#group-chat-copy-id",
  );
  const groupChatStatus =
    requiredElement<HTMLElement>("#group-chat-status");
  const groupChatMessages =
    requiredElement<HTMLElement>("#group-chat-messages");
  const groupChatForm =
    requiredElement<HTMLFormElement>("#group-chat-form");
  const groupChatInput =
    requiredElement<HTMLTextAreaElement>("#group-chat-input");
  const groupChatSearchInput =
    requiredElement<HTMLInputElement>("#group-chat-search");
  const reportDialog = requiredElement<HTMLDialogElement>("#report-dialog");
  const reportForm = requiredElement<HTMLFormElement>("#report-form");
  const reportReason = requiredElement<HTMLSelectElement>("#report-reason");
  const reportDetails = requiredElement<HTMLTextAreaElement>("#report-details");
  const reportStatus = requiredElement<HTMLElement>("#report-status");
  const reportSubmit = requiredElement<HTMLButtonElement>("#report-submit");
  const moderationQueueButton = requiredElement<HTMLButtonElement>(
    "#moderation-queue-button",
  );
  const moderationQueueDialog = requiredElement<HTMLDialogElement>(
    "#moderation-queue-dialog",
  );
  const moderationQueueStatus = requiredElement<HTMLElement>(
    "#moderation-queue-status",
  );
  const moderationQueueList = requiredElement<HTMLElement>(
    "#moderation-queue-list",
  );
  const siteFeedbackForm = requiredElement<HTMLFormElement>(
    "#site-feedback-form",
  );
  const siteFeedbackLoginNote = requiredElement<HTMLElement>(
    "#site-feedback-login-note",
  );
  const siteFeedbackLoginButton = requiredElement<HTMLButtonElement>(
    "#site-feedback-login-button",
  );
  const siteFeedbackCategory = requiredElement<HTMLSelectElement>(
    "#site-feedback-category",
  );
  const siteFeedbackMessage = requiredElement<HTMLTextAreaElement>(
    "#site-feedback-message",
  );
  const siteFeedbackStatus = requiredElement<HTMLElement>(
    "#site-feedback-status",
  );
  const siteFeedbackSubmit = requiredElement<HTMLButtonElement>(
    "#site-feedback-submit",
  );
  const siteFeedbackQueueButton = requiredElement<HTMLButtonElement>(
    "#site-feedback-queue-button",
  );
  const siteFeedbackQueueDialog = requiredElement<HTMLDialogElement>(
    "#site-feedback-queue-dialog",
  );
  const siteFeedbackQueueStatus = requiredElement<HTMLElement>(
    "#site-feedback-queue-status",
  );
  const siteFeedbackQueueList = requiredElement<HTMLElement>(
    "#site-feedback-queue-list",
  );
  const authMode = { value: "login" as "login" | "register" | "reset" };
  let authSuccessTimeout: number | null = null;

  let user: User | null = null;
  let profile: StudentProfile | null = null;
  let posts: FeedPost[] = [];
  let groups: StudentGroup[] = [];
  let notifications: UserNotification[] = [];
  let unreadNotificationCount = 0;
  let activeFilter = "Tümü";
  let activeChatGroup: StudentGroup | null = null;
  let activeJoinRequestGroup: StudentGroup | null = null;
  let moderator = false;
  let selectedReportTarget: {
    type: ReportTargetType;
    id: string;
  } | null = null;
  let stopCommunityWatch: (() => void) | null = null;
  let stopMessageWatch: (() => void) | null = null;
  let stopNotificationWatch: (() => void) | null = null;
  let messageSearchTimer: number | null = null;
  let messageSearchVersion = 0;
  let initializedAuthState = false;

  const setStatus = (message: string) => {
    communityStatus.textContent = message;
  };

  function createDeleteButton(label: string): HTMLButtonElement {
    const button = element("button", "content-delete-button");
    button.type = "button";
    button.textContent = "Sil";
    button.setAttribute("aria-label", label);
    return button;
  }

  function createReportButton(
    targetType: ReportTargetType,
    targetId: string,
  ): HTMLButtonElement {
    const button = element("button", "content-report-button");
    button.type = "button";
    button.textContent = "Şikâyet et";
    button.addEventListener("click", () => {
      if (!user) {
        openAuth();
        return;
      }
      selectedReportTarget = { type: targetType, id: targetId };
      reportForm.reset();
      reportStatus.textContent = "";
      reportDialog.showModal();
      reportReason.focus();
    });
    return button;
  }

  function createBlockButton(
    targetUserId: string,
    targetName: string,
    status: HTMLElement,
    onBlocked: () => Promise<void>,
  ): HTMLButtonElement {
    const button = element("button", "content-block-button");
    button.type = "button";
    button.textContent = "Engelle";
    button.setAttribute("aria-label", `${targetName} kullanıcısını engelle`);
    button.addEventListener("click", async () => {
      if (
        !user ||
        !window.confirm(
          `${targetName} kullanıcısını engellemek istiyor musun? Bu kişinin içerikleri senden gizlenir.`,
        )
      ) {
        return;
      }
      button.disabled = true;
      status.textContent = "";
      try {
        await blockUser(targetUserId);
        status.textContent = `${targetName} engellendi.`;
        try {
          await onBlocked();
        } catch (error) {
          status.textContent =
            `${targetName} engellendi, ancak içerik yenilenemedi: ${describeError(error)}`;
        }
      } catch (error) {
        status.textContent = describeError(error);
      } finally {
        button.disabled = false;
      }
    });
    return button;
  }

  function setAuthMode(mode: "login" | "register" | "reset"): void {
    if (authSuccessTimeout !== null) {
      window.clearTimeout(authSuccessTimeout);
      authSuccessTimeout = null;
    }
    authMode.value = mode;
    const registering = mode === "register";
    const resetting = mode === "reset";
    accountTitle.textContent = resetting
      ? "Yeni şifreni belirle."
      : registering
        ? "Aramıza katıl."
        : "Tekrar hoş geldin.";
    accountDescription.textContent = resetting
      ? "Yeni şifreni iki kez gir."
      : registering
        ? "E-posta adresinle yeni bir hesap oluştur."
        : "E-posta adresinle giriş yap.";
    authSubmit.textContent = resetting
      ? "Şifreyi güncelle"
      : registering
        ? "Hesap oluştur"
        : "Giriş yap";
    authRegisterFields.hidden = !registering;
    authPasswordConfirmField.hidden = !registering && !resetting;
    authDisplayName.required = registering;
    authDepartment.required = registering;
    authPasswordConfirm.required = registering || resetting;
    authPassword.autocomplete =
      registering || resetting ? "new-password" : "current-password";
    requiredElement<HTMLButtonElement>("#auth-forgot-button").hidden =
      registering || resetting;
    accountStatus.textContent = "";
    accountStatus.classList.remove("auth-status--success");
    document
      .querySelectorAll<HTMLButtonElement>("[data-auth-mode]")
      .forEach((button) => {
        const selected = button.dataset.authMode === mode;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  }

  function openAuth(mode: "login" | "register" | "reset" = "login"): void {
    setAuthMode(mode);
    accountDialog.showModal();
    authEmail.focus();
  }

  function updateAvatarPreview(
    target: HTMLElement,
    name: string,
    imageUrl: string | null,
  ): void {
    if (imageUrl) {
      const image = element("img");
      image.alt = "Profil fotoğrafı";
      image.src = imageUrl;
      target.replaceChildren(image);
      return;
    }
    target.textContent = name.trim().slice(0, 1).toLocaleUpperCase("tr-TR") || "?";
  }

  function renderProfileIdeas(ideas: ProfileIdea[]): void {
    if (ideas.length === 0) {
      const empty = element("p", "profile-view__empty");
      empty.textContent = "Henüz fikir paylaşmamış.";
      profileViewIdeas.replaceChildren(empty);
      return;
    }

    profileViewIdeas.replaceChildren(
      ...ideas.map((idea) => {
        const card = element("article", "profile-idea");
        const meta = element("div", "profile-idea__meta");
        const category = element("span", "profile-idea__category");
        category.textContent = idea.is_hidden
          ? `${idea.category} · Gizli`
          : idea.category;
        const date = element("time", "profile-idea__date");
        date.dateTime = idea.created_at;
        date.textContent = new Intl.DateTimeFormat("tr-TR", {
          dateStyle: "medium",
        }).format(new Date(idea.created_at));
        meta.append(category, date);
        const content = element("p", "profile-idea__content");
        content.textContent = idea.content;
        card.append(meta, content);
        return card;
      }),
    );
  }

  function createPostCommentCard(
    comment: PostComment,
    status: HTMLElement,
    onDeleted: () => Promise<void>,
  ): HTMLElement {
    const card = element("article", "post-comment");
    const header = element("div", "post-comment__header");
    const name = element("p", "post-comment__name");
    name.textContent = comment.is_hidden
      ? `${comment.author.display_name} · Gizli`
      : comment.author.display_name;
    const date = element("time", "post-comment__date");
    date.dateTime = comment.created_at;
    date.textContent = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(comment.created_at));
    header.append(name, date);
    const content = element("p", "post-comment__content");
    content.textContent = comment.content;
    card.append(header, content);
    if (user?.id === comment.author.id) {
      const deleteButton = createDeleteButton("Yorumu sil");
      deleteButton.addEventListener("click", async () => {
        if (
          !user ||
          !window.confirm("Yorumunu silmek istediğine emin misin?")
        ) {
          return;
        }
        deleteButton.disabled = true;
        status.textContent = "";
        try {
          await deletePostComment({
            commentId: comment.id,
            authorId: user.id,
          });
          try {
            await onDeleted();
            status.textContent = "Yorum silindi.";
          } catch (error) {
            status.textContent = `Yorum silindi, ancak liste yenilenemedi: ${describeError(error)}`;
          }
        } catch (error) {
          status.textContent = describeError(error);
        } finally {
          deleteButton.disabled = false;
        }
      });
      card.append(deleteButton);
    } else if (user) {
      card.append(createReportButton("comment", comment.id));
      card.append(
        createBlockButton(
          comment.author.id,
          comment.author.display_name,
          status,
          async () => {
            await onDeleted();
            await refreshPosts();
          },
        ),
      );
    }
    return card;
  }

  function createPostCard(post: FeedPost): HTMLElement {
    const card = element("article", "feed-card");
    card.dataset.postId = post.id;
    const header = element("div", "feed-card__header");
    const avatar = element("span", "avatar");
    if (post.author.avatar_url) {
      const image = element("img");
      image.src = post.author.avatar_url;
      image.alt = "";
      image.loading = "lazy";
      image.className = "avatar__image";
      avatar.append(image);
    } else {
      avatar.textContent =
        post.author.display_name
          .trim()
          .slice(0, 1)
          .toLocaleUpperCase("tr-TR") || "?";
    }
    avatar.setAttribute("aria-hidden", "true");

    const identity = element("div", "feed-card__identity");
    const name = element("p", "feed-card__name");
    name.textContent = post.author.display_name;
    const meta = element("p", "feed-card__meta");
    meta.textContent = `${post.author.department} · ${new Intl.DateTimeFormat(
      "tr-TR",
      { dateStyle: "medium", timeStyle: "short" },
    ).format(new Date(post.created_at))}`;
    identity.append(name, meta);

    const tag = element("span", "feed-card__tag");
    tag.textContent = post.is_hidden
      ? `${post.category} · Gizli`
      : post.category;
    header.append(avatar, identity, tag);

    const body = element("p", "feed-card__body");
    body.textContent = post.content;

    const footer = element("div", "feed-card__footer");
    const like = element("button", "feed-like");
    like.type = "button";
    like.disabled = post.is_hidden;
    like.setAttribute("aria-pressed", String(post.liked));
    like.setAttribute(
      "aria-label",
      post.liked
        ? `Beğeniyi geri al, ${post.like_count} beğeni`
        : `Beğen, ${post.like_count} beğeni`,
    );
    like.textContent = `${post.liked ? "♥" : "♡"}  ${post.like_count} beğeni`;
    like.addEventListener("click", async () => {
      if (!user) return;
      like.disabled = true;
      try {
        await togglePostLike({
          userId: user.id,
          postId: post.id,
          liked: post.liked,
        });
        await refreshPosts();
      } catch (error) {
        setStatus(describeError(error));
      } finally {
        like.disabled = false;
      }
    });

    const commentsToggle = element("button", "post-comments__toggle");
    commentsToggle.type = "button";
    commentsToggle.textContent = "Yorumları gör";
    commentsToggle.setAttribute("aria-expanded", "false");

    const commentsPanel = element("section", "post-comments__panel");
    commentsPanel.id = `post-comments-${post.id}`;
    commentsPanel.setAttribute("aria-label", "Yorumlar");
    commentsPanel.hidden = true;
    commentsToggle.setAttribute("aria-controls", commentsPanel.id);

    const commentsList = element("div", "post-comments__list");
    const commentsEmpty = element("p", "post-comments__empty");
    commentsEmpty.textContent = "Henüz yorum yok. İlk yorumu sen yaz.";
    const commentStatus = element("p", "post-comments__status");
    commentStatus.setAttribute("role", "status");
    commentStatus.setAttribute("aria-live", "polite");

    const commentForm = element("form", "post-comments__form");
    commentForm.hidden = post.is_hidden;
    const commentInput = element("textarea", "post-comments__input");
    commentInput.maxLength = 2000;
    commentInput.rows = 2;
    commentInput.required = true;
    commentInput.setAttribute("aria-label", "Yorum metni");
    commentInput.placeholder = "Bu fikre yorum yaz…";
    const commentSubmit = element("button", "button button--primary");
    commentSubmit.type = "submit";
    commentSubmit.textContent = "Yorum gönder";
    commentForm.append(commentInput, commentSubmit);
    commentsPanel.append(commentsList, commentsEmpty, commentStatus, commentForm);

    let commentsLoaded = false;
    async function refreshPostComments(): Promise<void> {
      const comments = await loadPostComments(post.id);
      commentsList.replaceChildren(
        ...comments.map((comment) =>
          createPostCommentCard(comment, commentStatus, refreshPostComments),
        ),
      );
      commentsEmpty.hidden = comments.length > 0;
      commentsToggle.textContent =
        comments.length > 0 ? `Yorumlar (${comments.length})` : "Yorum yap";
      commentsLoaded = true;
    }

    commentsToggle.addEventListener("click", async () => {
      const expanded = commentsPanel.hidden;
      commentsPanel.hidden = !expanded;
      commentsToggle.setAttribute("aria-expanded", String(expanded));
      if (!expanded || commentsLoaded) return;
      commentStatus.textContent = "Yorumlar yükleniyor…";
      try {
        await refreshPostComments();
        commentStatus.textContent = "";
      } catch (error) {
        commentStatus.textContent = describeError(error);
      }
    });

    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!user) {
        openAuth();
        return;
      }
      const result = validateCommentContent(commentInput.value);
      if (!result.valid) {
        commentStatus.textContent = result.reason;
        return;
      }
      commentSubmit.disabled = true;
      commentStatus.textContent = "";
      try {
        await createPostComment({
          postId: post.id,
          authorId: user.id,
          content: result.value,
        });
        commentInput.value = "";
        commentsLoaded = false;
        commentStatus.textContent = "Yorumun eklendi.";
        try {
          await refreshPostComments();
        } catch (error) {
          commentStatus.textContent = `Yorumun eklendi, ancak liste yenilenemedi: ${describeError(error)}`;
        }
      } catch (error) {
        commentStatus.textContent = describeError(error);
      } finally {
        commentSubmit.disabled = false;
      }
    });

    footer.append(like, commentsToggle);
    if (user?.id === post.author.id) {
      const deleteButton = createDeleteButton("Fikri sil");
      deleteButton.addEventListener("click", async () => {
        if (!user || !window.confirm("Fikrini silmek istediğine emin misin?")) {
          return;
        }
        deleteButton.disabled = true;
        setStatus("");
        try {
          await deletePost({ postId: post.id, userId: user.id });
          posts = posts.filter((item) => item.id !== post.id);
          renderPosts();
          setStatus("Fikrin silindi.");
        } catch (error) {
          setStatus(describeError(error));
        } finally {
          deleteButton.disabled = false;
        }
      });
      footer.append(deleteButton);
    } else if (user) {
      footer.append(createReportButton("post", post.id));
      footer.append(
        createBlockButton(
          post.author.id,
          post.author.display_name,
          communityStatus,
          refreshPosts,
        ),
      );
    }
    card.append(header, body, footer, commentsPanel);
    return card;
  }

  async function refreshPosts(): Promise<void> {
    if (!user) return;
    const loadedPosts = await loadPosts(user.id);
    posts = loadedPosts;
    renderPosts();
  }

  function renderPosts(): void {
    const visiblePosts = posts.filter(
      (post) => activeFilter === "Tümü" || post.category === activeFilter,
    );
    communityFeed.replaceChildren(...visiblePosts.map(createPostCard));
    communityFeed.hidden = visiblePosts.length === 0;
    feedEmpty.hidden = visiblePosts.length > 0;
    feedEmpty.textContent = user
      ? activeFilter === "Tümü"
        ? "Henüz paylaşım yok. İlk fikri sen başlat."
        : "Bu başlıkta henüz paylaşım yok. İlk fikri sen başlat."
      : "Paylaşımları görmek ve katkıda bulunmak için e-posta ile giriş yap.";
  }

  function renderGroups(): void {
    const visibleGroups = filterGroups(groups, groupSearchInput.value);
    if (visibleGroups.length === 0) {
      const empty = element("p", "group-list__empty");
      empty.textContent = groups.length
        ? "Aramana uygun topluluk veya sohbet bulunamadı."
        : "Henüz topluluk yok. İlk grubu oluşturup arkadaşlarını davet et.";
      groupList.replaceChildren(empty);
      return;
    }
    groupList.replaceChildren(...visibleGroups.map(createGroupCard));
  }

  function createGroupCard(group: StudentGroup): HTMLElement {
    const card = element("article", "group-card");
    const mark = element("span", "group-card__mark");
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = group.name
      .trim()
      .slice(0, 1)
      .toLocaleUpperCase("tr-TR");
    const copy = element("div", "group-card__copy");
    const name = element("p", "group-card__name");
    name.textContent = group.is_hidden ? `${group.name} · Gizli` : group.name;
    const description = element("p", "group-card__description");
    description.textContent = group.description || "Öğrenci topluluğu.";
    const details = element("p", "group-card__details");
    details.textContent =
      `Sahibi: ${group.ownerName} · ${group.memberCount} üye`;
    const lastMessage = element("p", "group-card__last-message");
    if (group.lastMessagePreview) {
      lastMessage.textContent = `Son mesaj: ${group.lastMessagePreview}`;
    } else if (group.lastMessageAt) {
      lastMessage.textContent = `Son etkinlik: ${new Intl.DateTimeFormat(
        "tr-TR",
        { dateStyle: "short", timeStyle: "short" },
      ).format(new Date(group.lastMessageAt))}`;
    } else {
      lastMessage.textContent = "Henüz sohbet mesajı yok.";
    }
    copy.append(name, description, details, lastMessage);
    const actions = element("div", "group-card__actions");
    const action = element("button", "group-action");
    action.type = "button";
    action.textContent = group.is_hidden
      ? "İçerik gizli"
      : group.joined
        ? "Sohbete gir"
        : group.joinRequestStatus === "pending"
          ? "İstek gönderildi"
          : "Sohbete katıl";
    action.disabled =
      group.is_hidden || group.joinRequestStatus === "pending";
    action.classList.toggle("group-action--chat", group.joined);
    action.addEventListener("click", async () => {
      if (group.is_hidden) return;
      if (!user) {
        openAuth();
        return;
      }
      if (!group.joined) {
        action.disabled = true;
        try {
          await requestGroupJoin(group.id);
          setStatus("Katılma isteğin topluluk sahibine gönderildi.");
          try {
            await refreshGroups();
          } catch (error) {
            setStatus(
              `İstek gönderildi ancak topluluk listesi yenilenemedi: ${describeError(error)}`,
            );
          }
        } catch (error) {
          setStatus(describeError(error));
        } finally {
          action.disabled = false;
        }
        return;
      }
      await openGroupChat(group);
    });
    actions.append(action);
    if (group.owner_id === user?.id) {
      const requestsButton = element("button", "group-action");
      requestsButton.type = "button";
      requestsButton.textContent =
        `İstekler (${group.pendingJoinRequestCount})`;
      requestsButton.setAttribute(
        "aria-label",
        `${group.name}: ${group.pendingJoinRequestCount} bekleyen katılma isteği`,
      );
      requestsButton.addEventListener("click", () => {
        void openGroupJoinRequests(group);
      });
      actions.append(requestsButton);

      const deleteButton = element("button", "group-action group-action--delete");
      deleteButton.type = "button";
      deleteButton.textContent = "Sil";
      deleteButton.setAttribute("aria-label", `${group.name} topluluğunu sil`);
      deleteButton.addEventListener("click", async () => {
        if (
          !user ||
          !window.confirm(
            "Bu topluluk silinirse üyelikler ve sohbet mesajları da silinir; paylaşımlar genel akışta kalır. Devam edilsin mi?",
          )
        ) {
          return;
        }
        deleteButton.disabled = true;
        setStatus("");
        try {
          await deleteGroup({ groupId: group.id, ownerId: user.id });
          try {
            await refreshGroups();
            setStatus("Topluluk silindi.");
          } catch (error) {
            setStatus(
              `Topluluk silindi, ancak liste yenilenemedi: ${describeError(error)}`,
            );
          }
        } catch (error) {
          setStatus(describeError(error));
        } finally {
          deleteButton.disabled = false;
        }
      });
      actions.append(deleteButton);
    } else if (user) {
      actions.append(createReportButton("group", group.id));
    }
    card.append(mark, copy, actions);
    return card;
  }

  function createGroupJoinRequestCard(
    group: StudentGroup,
    request: GroupJoinRequest,
  ): HTMLElement {
    const card = element("article", "group-join-request");
    const copy = element("div", "group-join-request__copy");
    const message = element("p");
    message.textContent =
      `${request.requester.display_name} bu sohbete katılmak istiyor.`;
    const department = element("p");
    department.textContent = request.requester.department;
    copy.append(message, department);

    const actions = element("div", "group-join-request__actions");
    const approveButton = element("button", "group-join-request__action group-join-request__action--approve");
    approveButton.type = "button";
    approveButton.textContent = "Onayla";
    const rejectButton = element("button", "group-join-request__action");
    rejectButton.type = "button";
    rejectButton.textContent = "Reddet";

    const decide = async (approve: boolean) => {
      approveButton.disabled = true;
      rejectButton.disabled = true;
      groupRequestsStatus.textContent = "";
      try {
        await reviewGroupJoinRequest({ requestId: request.id, approve });
        try {
          await refreshGroups();
          await refreshGroupJoinRequests(group);
          groupRequestsStatus.textContent = approve
            ? `${request.requester.display_name} topluluğa eklendi.`
            : "Katılma isteği reddedildi.";
        } catch (error) {
          groupRequestsStatus.textContent =
            `İstek değerlendirildi ancak liste yenilenemedi: ${describeError(error)}`;
        }
      } catch (error) {
        groupRequestsStatus.textContent = describeError(error);
      } finally {
        approveButton.disabled = false;
        rejectButton.disabled = false;
      }
    };

    approveButton.addEventListener("click", () => void decide(true));
    rejectButton.addEventListener("click", () => void decide(false));
    actions.append(approveButton, rejectButton);
    card.append(copy, actions);
    return card;
  }

  async function refreshGroupJoinRequests(
    group: StudentGroup,
  ): Promise<void> {
    const requests = await loadGroupJoinRequests(group.id);
    if (activeJoinRequestGroup?.id !== group.id) return;
    if (requests.length === 0) {
      const empty = element("p", "group-list__empty");
      empty.textContent = "Bekleyen katılma isteği yok.";
      groupRequestsList.replaceChildren(empty);
      return;
    }
    groupRequestsList.replaceChildren(
      ...requests.map((request) => createGroupJoinRequestCard(group, request)),
    );
  }

  async function openGroupJoinRequests(group: StudentGroup): Promise<void> {
    if (!user || group.owner_id !== user.id) return;
    activeJoinRequestGroup = group;
    groupRequestsTitle.textContent = `${group.name} — katılma istekleri`;
    groupRequestsStatus.textContent = "İstekler yükleniyor…";
    groupRequestsList.replaceChildren();
    groupRequestsDialog.showModal();
    try {
      await refreshGroupJoinRequests(group);
      groupRequestsStatus.textContent = "";
    } catch (error) {
      groupRequestsStatus.textContent = describeError(error);
    }
  }

  groupRequestsDialog.addEventListener("close", () => {
    activeJoinRequestGroup = null;
  });

  async function refreshGroups(): Promise<void> {
    if (!user) return;
    groups = await loadGroups(user.id);
    renderGroups();
  }

  groupSearchInput.addEventListener("input", renderGroups);

  function renderNotifications(): void {
    const unreadCount = unreadNotificationCount;
    notificationsUnreadCount.hidden = unreadCount === 0;
    notificationsUnreadCount.textContent =
      unreadCount > 99 ? "99+" : String(unreadCount);
    notificationsButton.setAttribute(
      "aria-label",
      unreadCount > 0
        ? `Bildirimler, ${unreadCount} okunmamış`
        : "Bildirimler",
    );
    notificationsMarkAll.disabled = unreadCount === 0;

    if (notifications.length === 0) {
      const empty = element("p", "profile-view__empty");
      empty.textContent = "Henüz bildirimin yok.";
      notificationsList.replaceChildren(empty);
      return;
    }

    notificationsList.replaceChildren(
      ...notifications.map((notification) => {
        const button = element("button", "notification-item");
        button.type = "button";
        button.classList.toggle(
          "notification-item--unread",
          notification.read_at === null,
        );
        const title = element("span", "notification-item__title");
        title.textContent = notification.title;
        const body = element("span", "notification-item__body");
        body.textContent = notification.body;
        const time = element("time", "notification-item__time");
        time.dateTime = notification.created_at;
        time.textContent = new Intl.DateTimeFormat("tr-TR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(notification.created_at));
        button.append(title, body, time);
        button.addEventListener("click", () => {
          void openNotification(notification);
        });
        return button;
      }),
    );
  }

  async function refreshNotifications(): Promise<void> {
    if (!user) return;
    const [loadedNotifications, unreadCount] = await Promise.all([
      loadNotifications(user.id),
      loadUnreadNotificationCount(user.id),
    ]);
    notifications = loadedNotifications;
    unreadNotificationCount = unreadCount;
    renderNotifications();
  }

  async function openNotification(
    notification: UserNotification,
  ): Promise<void> {
    if (!user) return;
    notificationsStatus.textContent = "";
    if (notification.read_at === null) {
      try {
        await markNotificationRead(notification.id, user.id);
        notification.read_at = new Date().toISOString();
        unreadNotificationCount = Math.max(0, unreadNotificationCount - 1);
        renderNotifications();
      } catch (error) {
        notificationsStatus.textContent = describeError(error);
        return;
      }
    }
    notificationsDialog.close();

    if (notification.group_id) {
      try {
        await refreshGroups();
      } catch (error) {
        setStatus(describeError(error));
        return;
      }
      const group = groups.find(
        (candidate) => candidate.id === notification.group_id,
      );
      if (!group) return;
      if (
        notification.type === "group_join_request" &&
        group.owner_id === user.id
      ) {
        await openGroupJoinRequests(group);
      } else if (group.joined) {
        await openGroupChat(group);
      }
      return;
    }

    if (notification.post_id) {
      const postCard = [...document.querySelectorAll<HTMLElement>(".feed-card")]
        .find((card) => card.dataset.postId === notification.post_id);
      if (postCard) {
        document.querySelector("#topluluk")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        postCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  async function refreshBlockedUsers(): Promise<void> {
    if (!user) return;
    blockedUsersStatus.textContent = "Engellenenler yükleniyor…";
    const blockedUsers = await loadBlockedUsers(user.id);
    if (blockedUsers.length === 0) {
      const empty = element("p", "profile-view__empty");
      empty.textContent = "Henüz engellediğin biri yok.";
      blockedUsersList.replaceChildren(empty);
    } else {
      blockedUsersList.replaceChildren(
        ...blockedUsers.map((blockedUser) => {
          const item = element("article", "blocked-user-item");
          const copy = element("div", "blocked-user-item__copy");
          const name = element("span", "blocked-user-item__name");
          name.textContent = blockedUser.display_name;
          const department = element("span", "blocked-user-item__department");
          department.textContent = blockedUser.department;
          copy.append(name, department);
          const unblockButton = element(
            "button",
            "blocked-user-item__unblock",
          );
          unblockButton.type = "button";
          unblockButton.textContent = "Engeli kaldır";
          unblockButton.addEventListener("click", async () => {
            if (!user) return;
            unblockButton.disabled = true;
            blockedUsersStatus.textContent = "";
            try {
              await unblockUser(blockedUser.id);
              await refreshBlockedUsers();
              try {
                await Promise.all([refreshPosts(), refreshGroups()]);
                if (activeChatGroup) {
                  await refreshMessages(activeChatGroup.id);
                }
                blockedUsersStatus.textContent = "Engel kaldırıldı.";
              } catch (error) {
                blockedUsersStatus.textContent =
                  `Engel kaldırıldı ancak içerikler yenilenemedi: ${describeError(error)}`;
              }
            } catch (error) {
              blockedUsersStatus.textContent = describeError(error);
            } finally {
              unblockButton.disabled = false;
            }
          });
          item.append(copy, unblockButton);
          return item;
        }),
      );
    }
    blockedUsersStatus.textContent = "";
  }

  async function openBlockedUsers(): Promise<void> {
    blockedUsersDialog.showModal();
    try {
      await refreshBlockedUsers();
    } catch (error) {
      blockedUsersStatus.textContent = describeError(error);
    }
  }

  function createMessageCard(message: GroupMessage): HTMLElement {
    const ownMessage = message.author.id === user?.id;
    const card = element(
      "article",
      ownMessage ? "chat-message chat-message--own" : "chat-message",
    );
    const meta = element("p", "chat-message__meta");
    meta.textContent = `${message.author.display_name}${message.is_hidden ? " · Gizli" : ""} · ${new Intl.DateTimeFormat(
      "tr-TR",
      { timeStyle: "short" },
    ).format(new Date(message.created_at))}`;
    const content = element("p", "chat-message__content");
    content.textContent = message.content;
    card.append(meta, content);
    if (ownMessage) {
      const deleteButton = createDeleteButton("Sohbet mesajını sil");
      deleteButton.addEventListener("click", async () => {
        const groupId = activeChatGroup?.id;
        if (
          !user ||
          !groupId ||
          !window.confirm("Sohbet mesajını silmek istediğine emin misin?")
        ) {
          return;
        }
        deleteButton.disabled = true;
        groupChatStatus.textContent = "";
        try {
          await deleteMessage({
            messageId: message.id,
            userId: user.id,
            groupId,
          });
          await refreshMessages(groupId);
          groupChatStatus.textContent = "Mesaj silindi.";
        } catch (error) {
          groupChatStatus.textContent = describeError(error);
        } finally {
          deleteButton.disabled = false;
        }
      });
      card.append(deleteButton);
    } else if (user) {
      card.append(createReportButton("message", message.id));
      card.append(
        createBlockButton(
          message.author.id,
          message.author.display_name,
          groupChatStatus,
          async () => {
            if (activeChatGroup) await refreshMessages(activeChatGroup.id);
          },
        ),
      );
    }
    return card;
  }

  async function refreshMessages(
    groupId: string,
    clearSearchStatus = false,
  ): Promise<void> {
    const requestVersion = ++messageSearchVersion;
    const messages = await loadMessages(groupId, groupChatSearchInput.value);
    if (
      activeChatGroup?.id !== groupId ||
      requestVersion !== messageSearchVersion
    ) {
      return;
    }
    groupChatMessages.replaceChildren(...messages.map(createMessageCard));
    if (messages.length === 0) {
      const empty = element("p", "group-chat__empty");
      empty.textContent = groupChatSearchInput.value.trim()
        ? "Aramana uygun mesaj bulunamadı."
        : "Sohbeti başlatan ilk mesajı sen yaz.";
      groupChatMessages.append(empty);
    }
    groupChatMessages.scrollTop = groupChatMessages.scrollHeight;
    if (clearSearchStatus) groupChatStatus.textContent = "";
  }

  async function openGroupChat(group: StudentGroup): Promise<void> {
    if (stopMessageWatch) stopMessageWatch();
    if (messageSearchTimer !== null) {
      window.clearTimeout(messageSearchTimer);
      messageSearchTimer = null;
    }
    messageSearchVersion += 1;
    groupChatSearchInput.value = "";
    activeChatGroup = group;
    groupChatTitle.textContent = group.name;
    groupChatId.textContent = group.id;
    groupChatStatus.textContent = "Mesajlar yükleniyor…";
    groupChatMessages.replaceChildren();
    groupChatDialog.showModal();
    try {
      await refreshMessages(group.id);
      groupChatStatus.textContent = "";
      stopMessageWatch = watchGroupMessages(group.id, () => {
        void refreshMessages(group.id).catch((error: unknown) => {
          groupChatStatus.textContent = describeError(error);
        });
      });
    } catch (error) {
      groupChatStatus.textContent = describeError(error);
    }
  }

  const reportReasonLabels: Record<ReportReason, string> = {
    spam: "Spam veya yanıltıcı içerik",
    harassment: "Taciz veya zorbalık",
    inappropriate: "Uygunsuz içerik",
    privacy: "Kişisel bilgilerin paylaşılması",
    other: "Diğer",
  };
  const reportTargetLabels: Record<ReportTargetType, string> = {
    post: "Paylaşım",
    comment: "Yorum",
    message: "Mesaj",
    group: "Topluluk",
  };

  function createModerationReportCard(report: ContentReport): HTMLElement {
    const card = element("article", "moderation-report");
    const header = element("div", "moderation-report__header");
    const target = element("p", "moderation-report__target");
    target.textContent = `${reportTargetLabels[report.target_type]} · ${report.target_author_name}`;
    const date = element("time", "moderation-report__date");
    date.dateTime = report.created_at;
    date.textContent = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(report.created_at));
    header.append(target, date);

    const excerpt = element("p", "moderation-report__excerpt");
    excerpt.textContent = report.target_excerpt || "İçerik metni bulunmuyor.";
    const reason = element("p", "moderation-report__reason");
    reason.textContent = `Neden: ${reportReasonLabels[report.reason]}`;
    const details = element("p", "moderation-report__details");
    details.textContent = report.details || "Ek açıklama yok.";
    const status = element("p", "moderation-report__status");
    status.textContent =
      report.status === "dismissed"
        ? "Reddedildi"
        : report.status === "reviewed"
          ? "İncelendi"
          : "Yeni şikâyet";
    card.append(header, excerpt, reason, details, status);

    if (report.status !== "dismissed") {
      const actions = element("div", "moderation-report__actions");
      const hideButton = element("button", "moderation-report__action");
      hideButton.type = "button";
      hideButton.textContent = "İçeriği gizle";
      hideButton.disabled = report.target_hidden;
      const restoreButton = element("button", "moderation-report__action");
      restoreButton.type = "button";
      restoreButton.textContent = "Görünür yap";
      restoreButton.disabled = !report.target_hidden;
      const dismissButton = element("button", "moderation-report__action moderation-report__action--dismiss");
      dismissButton.type = "button";
      dismissButton.textContent = "Şikâyeti reddet";

      for (const [button, decision] of [
        [hideButton, "hide"],
        [restoreButton, "restore"],
        [dismissButton, "dismiss"],
      ] as const) {
        button.addEventListener("click", async () => {
          if (!moderator) return;
          const actionButtons =
            actions.querySelectorAll<HTMLButtonElement>("button");
          actionButtons.forEach((actionButton) => {
            actionButton.disabled = true;
          });
          moderationQueueStatus.textContent = "Karar uygulanıyor…";
          try {
            await moderateContentReport({
              reportId: report.id,
              decision,
            });
            moderationQueueStatus.textContent = "Karar kaydedildi.";
            try {
              await Promise.all([
                refreshModerationReports(),
                refreshPosts(),
                refreshGroups(),
                ...(activeChatGroup
                  ? [refreshMessages(activeChatGroup.id)]
                  : []),
              ]);
            } catch (error) {
              moderationQueueStatus.textContent = `Karar kaydedildi, ancak içerik yenilenemedi: ${describeError(error)}`;
            }
          } catch (error) {
            moderationQueueStatus.textContent = describeError(error);
            hideButton.disabled = report.target_hidden;
            restoreButton.disabled = !report.target_hidden;
            dismissButton.disabled = false;
          }
        });
      }
      actions.append(hideButton, restoreButton, dismissButton);
      card.append(actions);
    }
    return card;
  }

  async function refreshModerationReports(): Promise<void> {
    if (!moderator) return;
    moderationQueueStatus.textContent = "Şikâyetler yükleniyor…";
    const reports = await loadContentReports();
    moderationQueueList.replaceChildren(
      ...reports.map(createModerationReportCard),
    );
    if (reports.length === 0) {
      const empty = element("p", "moderation-queue__empty");
      empty.textContent = "Henüz şikâyet yok.";
      moderationQueueList.append(empty);
    }
    moderationQueueStatus.textContent = "";
  }

  const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
    design: "Tasarım önerisi",
    feature: "Yeni özellik önerisi",
    issue: "Sorun bildirimi",
    other: "Diğer",
  };

  function createSiteFeedbackCard(feedback: SiteFeedback): HTMLElement {
    const card = element("article", "moderation-report");
    const header = element("div", "moderation-report__header");
    const sender = element("p", "moderation-report__target");
    sender.textContent = `${feedback.user_display_name} · ${feedbackCategoryLabels[feedback.category]}`;
    const date = element("time", "moderation-report__date");
    date.dateTime = feedback.created_at;
    date.textContent = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(feedback.created_at));
    header.append(sender, date);

    const message = element("p", "moderation-report__excerpt");
    message.textContent = feedback.message;
    const status = element("p", "moderation-report__status");
    status.textContent =
      feedback.status === "new" ? "Yeni geri bildirim" : "İncelendi";
    card.append(header, message, status);

    if (feedback.status === "new") {
      const actions = element("div", "moderation-report__actions");
      const markButton = element("button", "moderation-report__action");
      markButton.type = "button";
      markButton.textContent = "İncelendi olarak işaretle";
      markButton.addEventListener("click", async () => {
        if (!moderator) return;
        markButton.disabled = true;
        siteFeedbackQueueStatus.textContent = "Güncelleniyor…";
        try {
          await markSiteFeedbackReviewed(feedback.id);
          await refreshSiteFeedback();
        } catch (error) {
          siteFeedbackQueueStatus.textContent = describeError(error);
          markButton.disabled = false;
        }
      });
      actions.append(markButton);
      card.append(actions);
    }

    return card;
  }

  async function refreshSiteFeedback(): Promise<void> {
    if (!moderator) return;
    siteFeedbackQueueStatus.textContent = "Geri bildirimler yükleniyor…";
    const feedbackItems = await loadSiteFeedback();
    siteFeedbackQueueList.replaceChildren(
      ...feedbackItems.map(createSiteFeedbackCard),
    );
    if (feedbackItems.length === 0) {
      const empty = element("p", "moderation-queue__empty");
      empty.textContent = "Henüz geri bildirim gönderilmemiş.";
      siteFeedbackQueueList.append(empty);
    }
    siteFeedbackQueueStatus.textContent = "";
  }

  async function setSignedInUser(nextUser: User | null): Promise<void> {
    if (initializedAuthState && user?.id === nextUser?.id) return;
    initializedAuthState = true;
    if (stopCommunityWatch) stopCommunityWatch();
    if (stopMessageWatch) stopMessageWatch();
    if (stopNotificationWatch) stopNotificationWatch();
    stopCommunityWatch = null;
    stopMessageWatch = null;
    stopNotificationWatch = null;
    activeChatGroup = null;
    activeJoinRequestGroup = null;
    if (groupRequestsDialog.open) groupRequestsDialog.close();
    if (notificationsDialog.open) notificationsDialog.close();
    if (blockedUsersDialog.open) blockedUsersDialog.close();
    moderator = false;
    moderationQueueButton.hidden = true;
    siteFeedbackQueueButton.hidden = true;
    user = nextUser;
    profile = null;
    posts = [];
    groups = [];
    notifications = [];
    unreadNotificationCount = 0;
    renderNotifications();
    groupList.replaceChildren();
    communityFeed.replaceChildren();
    signedInControls.hidden = !nextUser;
    loginButton.hidden = Boolean(nextUser);
    postForm.hidden = !nextUser;
    siteFeedbackForm.hidden = !nextUser;
    siteFeedbackLoginNote.hidden = Boolean(nextUser);
    siteFeedbackStatus.textContent = "";
    requiredElement<HTMLButtonElement>("#create-group-button").hidden = !nextUser;
    requiredElement<HTMLButtonElement>("#create-group-button").disabled =
      !nextUser;

    if (!nextUser) {
      communityMessage.textContent =
        "Paylaşımları görmek ve topluluğa katılmak için e-posta ile hesap oluşturup giriş yap. Kayıt herkese açıktır; bu yöntem üniversite öğrenciliğini doğrulamaz.";
      signedInName.textContent = "";
      renderPosts();
      return;
    }

    communityMessage.textContent =
      "Hesabınla paylaşımlar ve topluluklar diğer kayıtlı kullanıcılarla eşitlenir. Yalnızca gerekli profil bilgilerini paylaş.";
    try {
      profile = await loadProfile(nextUser.id);
      signedInName.textContent = profile.display_name;
      updateAvatarPreview(
        profileAvatarPreview,
        profile.display_name,
        profile.avatar_url,
      );
      const moderatorCheck = isModerator();
      stopNotificationWatch = watchNotifications(nextUser.id, () => {
        void refreshNotifications().catch(
          (error: unknown) =>
            (notificationsStatus.textContent = describeError(error)),
        );
      });
      await Promise.all([
        refreshPosts(),
        refreshGroups(),
        refreshNotifications(),
      ]);
      try {
        moderator = await moderatorCheck;
      } catch (error) {
        setStatus(describeError(error));
      }
      moderationQueueButton.hidden = !moderator;
      siteFeedbackQueueButton.hidden = !moderator;
      stopCommunityWatch = watchCommunity(() => {
        void Promise.all([refreshPosts(), refreshGroups()]).catch(
          (error: unknown) => setStatus(describeError(error)),
        );
        if (activeJoinRequestGroup) {
          void refreshGroupJoinRequests(activeJoinRequestGroup).catch(
            (error: unknown) =>
              (groupRequestsStatus.textContent = describeError(error)),
          );
        }
      });
    } catch (error) {
      setStatus(describeError(error));
    }
  }

  document
    .querySelectorAll<HTMLButtonElement>("[data-auth-mode]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.authMode;
        if (mode === "login" || mode === "register") setAuthMode(mode);
      });
    });

  loginButton.addEventListener("click", () => openAuth());
  requiredElement<HTMLButtonElement>("#account-dialog-close").addEventListener(
    "click",
    () => accountDialog.close(),
  );

  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    accountStatus.textContent = "";
    authSubmit.disabled = true;
    try {
      if (authMode.value === "register") {
        if (authPassword.value !== authPasswordConfirm.value) {
          accountStatus.textContent = "Şifreler birbiriyle eşleşmiyor.";
          return;
        }
        if (authDisplayName.value.trim().length < 2) {
          accountStatus.textContent = "Adın en az 2 karakter olmalı.";
          return;
        }
        if (authDepartment.value.trim().length < 2) {
          accountStatus.textContent = "Bölüm bilgisi en az 2 karakter olmalı.";
          return;
        }
        const result = await registerWithEmail({
          email: authEmail.value,
          password: authPassword.value,
          displayName: authDisplayName.value,
          department: authDepartment.value,
        });
        if (!result.session) {
          accountForm.reset();
          setAuthMode("login");
          accountStatus.classList.add("auth-status--success");
          const successTitle = element("strong");
          successTitle.textContent = "Hesabın oluşturuldu!";
          const successMessage = element("span");
          successMessage.textContent =
            "Doğrulama e-postasını gönderdik. Gelen kutunu ve spam klasörünü kontrol et.";
          accountStatus.replaceChildren(successTitle, successMessage);
          authSuccessTimeout = window.setTimeout(() => {
            accountStatus.replaceChildren();
            accountStatus.classList.remove("auth-status--success");
            authSuccessTimeout = null;
          }, 8000);
          return;
        }
        accountDialog.close();
        accountForm.reset();
        await setSignedInUser(result.user);
        return;
      }
      if (authMode.value === "reset") {
        if (authPassword.value !== authPasswordConfirm.value) {
          accountStatus.textContent = "Şifreler birbiriyle eşleşmiyor.";
          return;
        }
        await updatePassword(authPassword.value);
        accountDialog.close();
        accountForm.reset();
        accountStatus.textContent = "";
        setStatus("Şifren güncellendi.");
        return;
      }
      const result = await signInWithEmail(
        authEmail.value,
        authPassword.value,
      );
      accountDialog.close();
      accountForm.reset();
      await setSignedInUser(result.user);
    } catch (error) {
      accountStatus.textContent = describeError(error);
    } finally {
      authSubmit.disabled = false;
    }
  });

  requiredElement<HTMLButtonElement>("#auth-forgot-button").addEventListener(
    "click",
    async () => {
      if (!authEmail.value.trim()) {
        accountStatus.textContent = "Önce e-posta adresini yaz.";
        authEmail.focus();
        return;
      }
      accountStatus.textContent = "Şifre sıfırlama e-postası gönderiliyor…";
      try {
        await sendPasswordReset(authEmail.value);
        accountStatus.textContent =
          "E-posta adresine şifre yenileme bağlantısı gönderildiyse gelen kutunu kontrol et.";
      } catch (error) {
        accountStatus.textContent = describeError(error);
      }
    },
  );

  function openProfileEditor(): void {
    if (!profile) return;
    profileStatus.textContent = "";
    profileName.value = profile.display_name;
    profileDepartment.value = profile.department;
    profileUniversity.value = profile.university_name ?? "";
    profileBio.value = profile.bio ?? "";
    profileAvatar.value = "";
    updateAvatarPreview(
      profileAvatarPreview,
      profile.display_name,
      profile.avatar_url,
    );
    profileDialog.showModal();
  }

  requiredElement<HTMLButtonElement>("#profile-button").addEventListener(
    "click",
    async () => {
      if (!profile || !user) return;
      profileViewName.textContent = profile.display_name;
      profileViewDepartment.textContent = profile.department;
      profileViewUniversity.textContent = profile.university_name ?? "";
      profileViewUniversity.hidden = !profile.university_name;
      profileViewBio.textContent = profile.bio ?? "";
      profileViewBioSection.hidden = !profile.bio;
      updateAvatarPreview(
        profileViewAvatar,
        profile.display_name,
        profile.avatar_url,
      );
      const joinedGroups = groups.filter((group) => group.joined);
      if (joinedGroups.length === 0) {
        const empty = element("p", "profile-view__empty");
        empty.textContent = "Henüz bir topluluğa katılmamış.";
        profileViewGroups.replaceChildren(empty);
      } else {
        profileViewGroups.replaceChildren(
          ...joinedGroups.map((group) => {
            const item = element("p", "profile-view__group");
            item.textContent = group.is_hidden
              ? `${group.name} · Gizli`
              : group.name;
            return item;
          }),
        );
      }
      profileViewIdeas.replaceChildren();
      profileViewStatus.textContent = "Fikirler yükleniyor…";
      profileViewDialog.showModal();
      try {
        renderProfileIdeas(await loadProfileIdeas(user.id));
        profileViewStatus.textContent = "";
      } catch (error) {
        profileViewStatus.textContent = describeError(error);
      }
    },
  );
  requiredElement<HTMLButtonElement>("#profile-view-close").addEventListener(
    "click",
    () => profileViewDialog.close(),
  );
  requiredElement<HTMLButtonElement>("#profile-edit-button").addEventListener(
    "click",
    () => {
      profileViewDialog.close();
      openProfileEditor();
    },
  );
  requiredElement<HTMLButtonElement>(
    "#profile-dialog-close",
  ).addEventListener("click", () => profileDialog.close());
  profileAvatar.addEventListener("change", () => {
    const file = profileAvatar.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      profileStatus.textContent = "Profil fotoğrafı en fazla 5 MB olabilir.";
      profileAvatar.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      profileStatus.textContent = "Yalnızca JPG, PNG veya WebP yükleyebilirsin.";
      profileAvatar.value = "";
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    updateAvatarPreview(profileAvatarPreview, profileName.value, previewUrl);
  });
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user || !profile) return;
    if (profileName.value.trim().length < 2) {
      profileStatus.textContent = "Görünen ad en az 2 karakter olmalı.";
      return;
    }
    if (profileDepartment.value.trim().length < 2) {
      profileStatus.textContent = "Bölüm bilgisi en az 2 karakter olmalı.";
      return;
    }
    if (
      profileUniversity.value.trim() &&
      profileUniversity.value.trim().length < 2
    ) {
      profileStatus.textContent =
        "Üniversite adı en az 2 karakter olmalı veya boş bırakılmalı.";
      return;
    }
    profileSaveButton.disabled = true;
    profileStatus.textContent = "Profil kaydediliyor…";
    try {
      profile = await updateProfile({
        userId: user.id,
        displayName: profileName.value,
        department: profileDepartment.value,
        bio: profileBio.value,
        universityName: profileUniversity.value,
        avatarFile: profileAvatar.files?.[0],
        previousAvatarPath: profile.avatar_path,
      });
      signedInName.textContent = profile.display_name;
      profileStatus.textContent = "Profil güncellendi.";
      profileAvatar.value = "";
      await refreshPosts();
      window.setTimeout(() => profileDialog.close(), 500);
    } catch (error) {
      profileStatus.textContent = describeError(error);
    } finally {
      profileSaveButton.disabled = false;
    }
  });

  requiredElement<HTMLButtonElement>("#sign-out-button").addEventListener(
    "click",
    async () => {
      try {
        await signOut();
        await setSignedInUser(null);
      } catch (error) {
        setStatus(describeError(error));
      }
    },
  );

  postContent.addEventListener("input", () => {
    postCounter.textContent = `${postContent.value.length} / 500`;
  });
  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user) {
      openAuth();
      return;
    }
    const content = validatePostContent(postContent.value);
    if (!content.valid) {
      setStatus(content.reason);
      return;
    }
    if (!isPostCategory(postCategory.value)) {
      setStatus("Bir paylaşım konusu seç.");
      return;
    }
    const submit = postForm.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    try {
      await createPost({
        userId: user.id,
        content: content.value,
        category: postCategory.value,
      });
      postForm.reset();
      postCounter.textContent = "0 / 500";
      activeFilter = "Tümü";
      document
        .querySelectorAll<HTMLButtonElement>("[data-feed-filter]")
        .forEach((button) => {
          const selected = button.dataset.feedFilter === activeFilter;
          button.classList.toggle("is-active", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
      await refreshPosts();
      setStatus("Paylaşım topluluk akışına eklendi.");
    } catch (error) {
      setStatus(describeError(error));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  document
    .querySelectorAll<HTMLButtonElement>("[data-feed-filter]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.feedFilter ?? "Tümü";
        document
          .querySelectorAll<HTMLButtonElement>("[data-feed-filter]")
          .forEach((filterButton) => {
            const selected = filterButton === button;
            filterButton.classList.toggle("is-active", selected);
            filterButton.setAttribute("aria-pressed", String(selected));
          });
        renderPosts();
      });
    });

  requiredElement<HTMLButtonElement>("#create-group-button").addEventListener(
    "click",
    () => {
      if (!user) {
        openAuth();
        return;
      }
      groupFormStatus.textContent = "";
      groupDialog.showModal();
      groupNameInput.focus();
    },
  );
  requiredElement<HTMLButtonElement>("#group-dialog-close").addEventListener(
    "click",
    () => groupDialog.close(),
  );
  requiredElement<HTMLButtonElement>("#group-requests-close").addEventListener(
    "click",
    () => {
      activeJoinRequestGroup = null;
      groupRequestsDialog.close();
    },
  );
  groupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user) {
      openAuth();
      return;
    }
    const result = validateGroup(
      groupNameInput.value,
      groupDescriptionInput.value,
    );
    if (!result.valid) {
      groupFormStatus.textContent = result.reason;
      return;
    }
    const submit = groupForm.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    groupFormStatus.textContent = "";
    try {
      await createGroup({
        ownerId: user.id,
        name: result.name,
        description: result.description,
      });
      groupForm.reset();
      groupDialog.close();
      await refreshGroups();
      setStatus(
        "Topluluk oluşturuldu; katılma isteklerini onayladığında üyeler sohbete girebilir.",
      );
    } catch (error) {
      groupFormStatus.textContent = describeError(error);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  requiredElement<HTMLButtonElement>("#group-chat-close").addEventListener(
    "click",
    () => {
      if (stopMessageWatch) stopMessageWatch();
      stopMessageWatch = null;
      activeChatGroup = null;
      messageSearchVersion += 1;
      if (messageSearchTimer !== null) {
        window.clearTimeout(messageSearchTimer);
        messageSearchTimer = null;
      }
      groupChatDialog.close();
    },
  );
  groupChatSearchInput.addEventListener("input", () => {
    if (!activeChatGroup) return;
    if (messageSearchTimer !== null) {
      window.clearTimeout(messageSearchTimer);
    }
    const groupId = activeChatGroup.id;
    messageSearchTimer = window.setTimeout(() => {
      groupChatStatus.textContent = "Mesajlar aranıyor…";
      void refreshMessages(groupId, true).catch((error: unknown) => {
        if (activeChatGroup?.id === groupId) {
          groupChatStatus.textContent = describeError(error);
        }
      });
    }, 250);
  });
  groupChatCopyId.addEventListener("click", async () => {
    if (!activeChatGroup) return;
    try {
      await navigator.clipboard.writeText(activeChatGroup.id);
      groupChatStatus.textContent = "Sohbet ID'si panoya kopyalandı.";
    } catch (error) {
      groupChatStatus.textContent =
        `Sohbet ID'si kopyalanamadı: ${describeError(error)}`;
    }
  });
  groupChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user || !activeChatGroup) return;
    const content = groupChatInput.value.trim();
    if (!content || content.length > 2000) {
      groupChatStatus.textContent = "Mesaj 1–2000 karakter arasında olmalı.";
      return;
    }
    const submit = groupChatForm.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    try {
      await sendMessage({
        userId: user.id,
        groupId: activeChatGroup.id,
        content,
      });
      groupChatInput.value = "";
      await refreshMessages(activeChatGroup.id);
    } catch (error) {
      groupChatStatus.textContent = describeError(error);
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  requiredElement<HTMLButtonElement>("#report-dialog-close").addEventListener(
    "click",
    () => reportDialog.close(),
  );
  reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user || !selectedReportTarget) {
      reportDialog.close();
      return;
    }
    const reason = reportReason.value;
    if (!isReportReason(reason)) {
      reportStatus.textContent = "Bir şikâyet nedeni seç.";
      return;
    }
    reportSubmit.disabled = true;
    reportStatus.textContent = "Şikâyetin gönderiliyor…";
    try {
      await submitContentReport({
        targetType: selectedReportTarget.type,
        targetId: selectedReportTarget.id,
        reason,
        details: reportDetails.value,
      });
      reportDialog.close();
      selectedReportTarget = null;
      setStatus("Şikâyetin moderatöre iletildi.");
    } catch (error) {
      reportStatus.textContent = describeError(error);
    } finally {
      reportSubmit.disabled = false;
    }
  });
  requiredElement<HTMLButtonElement>(
    "#moderation-queue-close",
  ).addEventListener("click", () => moderationQueueDialog.close());
  moderationQueueButton.addEventListener("click", async () => {
    if (!moderator) return;
    moderationQueueDialog.showModal();
    try {
      await refreshModerationReports();
    } catch (error) {
      moderationQueueStatus.textContent = describeError(error);
    }
  });
  siteFeedbackLoginButton.addEventListener("click", () => openAuth());
  siteFeedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!user) {
      openAuth();
      return;
    }

    const category = siteFeedbackCategory.value;
    if (!isFeedbackCategory(category)) {
      siteFeedbackStatus.textContent = "Bir geri bildirim konusu seç.";
      return;
    }
    const message = siteFeedbackMessage.value.trim();
    if (message.length < 10 || message.length > 1000) {
      siteFeedbackStatus.textContent =
        "Geri bildirimin 10–1000 karakter arasında olmalı.";
      return;
    }

    siteFeedbackSubmit.disabled = true;
    siteFeedbackStatus.textContent = "Geri bildirimin gönderiliyor…";
    try {
      await submitSiteFeedback({ category, message });
      siteFeedbackForm.reset();
      siteFeedbackStatus.textContent =
        "Teşekkürler! Geri bildirimin yöneticiye ulaştı.";
    } catch (error) {
      siteFeedbackStatus.textContent = describeError(error);
    } finally {
      siteFeedbackSubmit.disabled = false;
    }
  });
  requiredElement<HTMLButtonElement>(
    "#site-feedback-queue-close",
  ).addEventListener("click", () => siteFeedbackQueueDialog.close());
  siteFeedbackQueueButton.addEventListener("click", async () => {
    if (!moderator) return;
    siteFeedbackQueueDialog.showModal();
    try {
      await refreshSiteFeedback();
    } catch (error) {
      siteFeedbackQueueStatus.textContent = describeError(error);
    }
  });
  requiredElement<HTMLButtonElement>("#notifications-close").addEventListener(
    "click",
    () => notificationsDialog.close(),
  );
  notificationsDialog.addEventListener("close", () => {
    notificationsStatus.textContent = "";
  });
  notificationsButton.addEventListener("click", async () => {
    notificationsStatus.textContent = "";
    notificationsDialog.showModal();
    try {
      await refreshNotifications();
    } catch (error) {
      notificationsStatus.textContent = describeError(error);
    }
  });
  notificationsMarkAll.addEventListener("click", async () => {
    if (!user) return;
    notificationsMarkAll.disabled = true;
    notificationsStatus.textContent = "";
    try {
      await markAllNotificationsRead(user.id);
      const readAt = new Date().toISOString();
      notifications = notifications.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? readAt,
      }));
      unreadNotificationCount = 0;
      renderNotifications();
    } catch (error) {
      notificationsStatus.textContent = describeError(error);
      notificationsMarkAll.disabled = false;
    }
  });
  requiredElement<HTMLButtonElement>("#blocked-users-close").addEventListener(
    "click",
    () => blockedUsersDialog.close(),
  );
  blockedUsersButton.addEventListener("click", () => {
    void openBlockedUsers();
  });
  blockedUsersDialog.addEventListener("close", () => {
    blockedUsersStatus.textContent = "";
  });

  const { data: authListener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
        accountDialog.showModal();
      }
      void setSignedInUser(session?.user ?? null).catch((error: unknown) => {
        setStatus(describeError(error));
      });
    },
  );
  void supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      return setSignedInUser(data.session?.user ?? null);
    })
    .catch((error: unknown) => setStatus(describeError(error)));
  window.addEventListener("beforeunload", () => {
    authListener.subscription.unsubscribe();
    if (stopCommunityWatch) stopCommunityWatch();
    if (stopMessageWatch) stopMessageWatch();
    if (stopNotificationWatch) stopNotificationWatch();
  });
}
