import type { User } from "@supabase/supabase-js";
import {
  createGroup,
  createPost,
  joinGroup,
  loadGroups,
  loadMessages,
  loadPosts,
  loadProfile,
  registerWithEmail,
  sendMessage,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  togglePostLike,
  updatePassword,
  updateProfile,
  watchCommunity,
  watchGroupMessages,
  type FeedPost,
  type GroupMessage,
  type StudentGroup,
  type StudentProfile,
} from "./community-api";
import {
  isPostCategory,
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
  const profileForm = requiredElement<HTMLFormElement>("#profile-form");
  const profileName = requiredElement<HTMLInputElement>(
    "#profile-display-name",
  );
  const profileDepartment = requiredElement<HTMLInputElement>(
    "#profile-department",
  );
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
  const groupChatDialog =
    requiredElement<HTMLDialogElement>("#group-chat-dialog");
  const groupChatTitle = requiredElement<HTMLElement>("#group-chat-title");
  const groupChatStatus =
    requiredElement<HTMLElement>("#group-chat-status");
  const groupChatMessages =
    requiredElement<HTMLElement>("#group-chat-messages");
  const groupChatForm =
    requiredElement<HTMLFormElement>("#group-chat-form");
  const groupChatInput =
    requiredElement<HTMLTextAreaElement>("#group-chat-input");
  const authMode = { value: "login" as "login" | "register" | "reset" };

  let user: User | null = null;
  let profile: StudentProfile | null = null;
  let posts: FeedPost[] = [];
  let groups: StudentGroup[] = [];
  let activeFilter = "Tümü";
  let activeChatGroup: StudentGroup | null = null;
  let stopCommunityWatch: (() => void) | null = null;
  let stopMessageWatch: (() => void) | null = null;
  let initializedAuthState = false;

  const setStatus = (message: string) => {
    communityStatus.textContent = message;
  };

  function setAuthMode(mode: "login" | "register" | "reset"): void {
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

  function createPostCard(post: FeedPost): HTMLElement {
    const card = element("article", "feed-card");
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
    footer.append(like);
    card.append(header, body, footer);
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
    name.textContent = group.name;
    const description = element("p", "group-card__description");
    description.textContent = group.description || "Öğrenci topluluğu.";
    copy.append(name, description);
    const actions = element("div", "group-card__actions");
    const action = element("button", "group-action");
    action.type = "button";
    action.textContent = group.joined ? "Sohbete gir" : "Katıl";
    action.classList.toggle("group-action--chat", group.joined);
    action.addEventListener("click", async () => {
      if (!user) {
        openAuth();
        return;
      }
      if (!group.joined) {
        action.disabled = true;
        try {
          await joinGroup({ userId: user.id, groupId: group.id });
          await refreshGroups();
          setStatus("Topluluğa katıldın.");
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
    card.append(mark, copy, actions);
    return card;
  }

  async function refreshGroups(): Promise<void> {
    if (!user) return;
    groups = await loadGroups(user.id);
    if (groups.length === 0) {
      const empty = element("p", "group-list__empty");
      empty.textContent =
        "Henüz topluluk yok. İlk grubu oluşturup arkadaşlarını davet et.";
      groupList.replaceChildren(empty);
      return;
    }
    groupList.replaceChildren(...groups.map(createGroupCard));
  }

  function createMessageCard(message: GroupMessage): HTMLElement {
    const card = element(
      "article",
      message.author.id === user?.id
        ? "chat-message chat-message--own"
        : "chat-message",
    );
    const meta = element("p", "chat-message__meta");
    meta.textContent = `${message.author.display_name} · ${new Intl.DateTimeFormat(
      "tr-TR",
      { timeStyle: "short" },
    ).format(new Date(message.created_at))}`;
    const content = element("p", "chat-message__content");
    content.textContent = message.content;
    card.append(meta, content);
    return card;
  }

  async function refreshMessages(groupId: string): Promise<void> {
    const messages = await loadMessages(groupId);
    if (activeChatGroup?.id !== groupId) return;
    groupChatMessages.replaceChildren(...messages.map(createMessageCard));
    if (messages.length === 0) {
      const empty = element("p", "group-chat__empty");
      empty.textContent = "Sohbeti başlatan ilk mesajı sen yaz.";
      groupChatMessages.append(empty);
    }
    groupChatMessages.scrollTop = groupChatMessages.scrollHeight;
  }

  async function openGroupChat(group: StudentGroup): Promise<void> {
    if (stopMessageWatch) stopMessageWatch();
    activeChatGroup = group;
    groupChatTitle.textContent = group.name;
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

  async function setSignedInUser(nextUser: User | null): Promise<void> {
    if (initializedAuthState && user?.id === nextUser?.id) return;
    initializedAuthState = true;
    if (stopCommunityWatch) stopCommunityWatch();
    if (stopMessageWatch) stopMessageWatch();
    stopCommunityWatch = null;
    stopMessageWatch = null;
    activeChatGroup = null;
    user = nextUser;
    profile = null;
    posts = [];
    groups = [];
    groupList.replaceChildren();
    communityFeed.replaceChildren();
    signedInControls.hidden = !nextUser;
    loginButton.hidden = Boolean(nextUser);
    postForm.hidden = !nextUser;
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
      await Promise.all([refreshPosts(), refreshGroups()]);
      stopCommunityWatch = watchCommunity(() => {
        void Promise.all([refreshPosts(), refreshGroups()]).catch(
          (error: unknown) => setStatus(describeError(error)),
        );
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
          accountStatus.textContent =
            "Hesabın oluşturuldu. Giriş yapmadan önce e-postana gönderilen doğrulama bağlantısını aç.";
          accountForm.reset();
          setAuthMode("login");
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

  requiredElement<HTMLButtonElement>("#profile-button").addEventListener(
    "click",
    () => {
      if (!profile) return;
      profileStatus.textContent = "";
      profileName.value = profile.display_name;
      profileDepartment.value = profile.department;
      profileAvatar.value = "";
      updateAvatarPreview(
        profileAvatarPreview,
        profile.display_name,
        profile.avatar_url,
      );
      profileDialog.showModal();
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
    profileSaveButton.disabled = true;
    profileStatus.textContent = "Profil kaydediliyor…";
    try {
      profile = await updateProfile({
        userId: user.id,
        displayName: profileName.value,
        department: profileDepartment.value,
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
      setStatus("Topluluk oluşturuldu; üyeler katılıp sohbete başlayabilir.");
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
      groupChatDialog.close();
    },
  );
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
  });
}
