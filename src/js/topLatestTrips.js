const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const PLAN_DRAFT_STORAGE_KEY = "tripCompassPlanDraft";
const LIKE_COUNT_STORAGE_KEY = "trip-compass-like-counts";
const CREATE_PLAN_CITY_IMAGE_SUFFIX = "-edit.webp";
const LIKE_BUTTONS_UPDATED_EVENT = "trip-compass:likes-updated";
const HEART_ICON_PATH =
  "M378.9 80c-27.3 0-53 13.1-69 35.2l-34.4 47.6c-4.5 6.2-11.7 9.9-19.4 9.9s-14.9-3.7-19.4-9.9l-34.4-47.6c-16-22.1-41.7-35.2-69-35.2-47 0-85.1 38.1-85.1 85.1 0 49.9 32 98.4 68.1 142.3 41.1 50 91.4 94 125.9 120.3 3.2 2.4 7.9 4.2 14 4.2s10.8-1.8 14-4.2c34.5-26.3 84.8-70.4 125.9-120.3 36.2-43.9 68.1-92.4 68.1-142.3 0-47-38.1-85.1-85.1-85.1zM271 87.1c25-34.6 65.2-55.1 107.9-55.1 73.5 0 133.1 59.6 133.1 133.1 0 68.6-42.9 128.9-79.1 172.8-44.1 53.6-97.3 100.1-133.8 127.9-12.3 9.4-27.5 14.1-43.1 14.1s-30.8-4.7-43.1-14.1C176.4 438 123.2 391.5 79.1 338 42.9 294.1 0 233.7 0 165.1 0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1l15 20.7 15-20.7z";
const destinationImageIdPattern = /^[a-z0-9-]+$/;
const cityImageUrls = import.meta.glob("../assets/cities/*-edit.webp", {
  eager: true,
  import: "default",
  query: "?url",
});
const fallbackImageUrls = import.meta.glob("../assets/top/kv-image.webp", {
  eager: true,
  import: "default",
  query: "?url",
});
const fallbackImageUrl =
  fallbackImageUrls["../assets/top/kv-image.webp"] ||
  "/src/assets/top/kv-image.webp";

// 作成済みしおり一覧を localStorage から取得する。
const getStoredCreatedPlans = () => {
  try {
    const plans = JSON.parse(
      localStorage.getItem(CREATED_PLANS_STORAGE_KEY) || "[]",
    );

    return Array.isArray(plans) ? plans : [];
  } catch {
    return [];
  }
};

// localStorage のいいね数を取得する。
const getStoredLikeCounts = () => {
  try {
    const counts = JSON.parse(
      localStorage.getItem(LIKE_COUNT_STORAGE_KEY) || "{}",
    );

    return counts && typeof counts === "object" ? counts : {};
  } catch {
    return {};
  }
};

// 作成済みしおり一覧を localStorage に保存する。
const setStoredCreatedPlans = (plans) => {
  try {
    localStorage.setItem(CREATED_PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    return;
  }
};

// 表示用の公開ステータス文言を返す。
const getPublicStatusText = (isPublic) => (isPublic ? "公開中" : "非公開中");

// 同じしおりを開いたときも公開設定が揃うように下書き側も更新する。
const updateStoredDraftPlanPublicStatus = (planId, isPublic) => {
  try {
    const draftPlan = JSON.parse(
      localStorage.getItem(PLAN_DRAFT_STORAGE_KEY) || "null",
    );

    if (!draftPlan || draftPlan.id !== planId) {
      return;
    }

    localStorage.setItem(
      PLAN_DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...draftPlan,
        isPublic,
      }),
    );
  } catch {
    return;
  }
};

// 指定されたしおりの公開設定を切り替えて保存する。
const toggleStoredPlanPublicStatus = (planId) => {
  if (!planId) {
    return null;
  }

  let nextIsPublic = null;
  const nextPlans = getStoredCreatedPlans().map((plan) => {
    if (!plan || plan.id !== planId) {
      return plan;
    }

    nextIsPublic = plan.isPublic !== true;

    return {
      ...plan,
      isPublic: nextIsPublic,
    };
  });

  if (nextIsPublic === null) {
    return null;
  }

  setStoredCreatedPlans(nextPlans);
  updateStoredDraftPlanPublicStatus(planId, nextIsPublic);

  return nextIsPublic;
};

// しおりの先頭旅行先に対応する一覧サムネイル画像を返す。
const getTripImageUrl = (plan) => {
  const [destination] = Array.isArray(plan?.destinations)
    ? plan.destinations
    : [];

  if (!destination || !destinationImageIdPattern.test(destination.id)) {
    return fallbackImageUrl;
  }

  const fileName = `${destination.id}${CREATE_PLAN_CITY_IMAGE_SUFFIX}`;
  const modulePath = `../assets/cities/${fileName}`;

  return cityImageUrls[modulePath] || fallbackImageUrl;
};

// 保存された日程文字列を一覧表示用の表記へ整える。
const formatDateText = (dateText) => {
  if (typeof dateText !== "string" || !dateText.trim()) {
    return "日程未定";
  }

  return dateText
    .split(" 〜 ")
    .map((date) => date.replaceAll("/", "."))
    .join(" - ");
};

// 並び替えに使う更新日または作成日を YYYY-MM-DD 形式で返す。
const getSortDate = (plan) => {
  const date = new Date(plan?.updatedAt || plan?.createdAt || Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

// 公開しおりのいいね ID を返す。
const getPublicTripLikeId = (plan) => `trip-${plan.id}`;

// 公開しおりの初期いいね数を返す。
const getInitialLikeCount = (plan, storedCounts = getStoredLikeCounts()) => {
  const storedCount = storedCounts[getPublicTripLikeId(plan)];

  if (Number.isFinite(storedCount)) {
    return Math.max(0, Math.floor(storedCount));
  }

  return Number.isFinite(plan?.likeCount)
    ? Math.max(0, Math.floor(plan.likeCount))
    : 0;
};

// みんなのしおりの現在の並び替え条件を返す。
const getPublicSortOrder = () => {
  const sort = document.querySelector('[data-sort="public-trips"]');

  if (!(sort instanceof HTMLElement)) {
    return "desc";
  }

  return sort.dataset.sortOrder === "likes_desc" ? "likes_desc" : "desc";
};

// みんなのしおりを指定条件で並び替える。
const getSortedPublicPlans = (plans) => {
  const sortOrder = getPublicSortOrder();
  const storedCounts = getStoredLikeCounts();

  return [...plans].sort((planA, planB) => {
    if (sortOrder === "likes_desc") {
      const likeDiff =
        getInitialLikeCount(planB, storedCounts) -
        getInitialLikeCount(planA, storedCounts);

      if (likeDiff !== 0) {
        return likeDiff;
      }
    }

    return (
      new Date(getSortDate(planB)).getTime() -
      new Date(getSortDate(planA)).getTime()
    );
  });
};

// いいね数が多い順を選択中なら、押下後の数で並び替え直す。
const setupPublicTripSort = () => {
  window.addEventListener(LIKE_BUTTONS_UPDATED_EVENT, (event) => {
    if (
      event instanceof CustomEvent &&
      event.detail &&
      getPublicSortOrder() === "likes_desc"
    ) {
      renderTopPublicTrips();
    }
  });
};

// いいねボタンの追加後に、初期化処理へ通知する。
const notifyLikeButtonsUpdated = () => {
  window.dispatchEvent(new CustomEvent(LIKE_BUTTONS_UPDATED_EVENT));
};

// 一覧カード内の操作アイコンを作る。
const createIcon = (src, modifierClass = "") => {
  const icon = document.createElement("span");
  const image = document.createElement("img");

  icon.className = ["c-column__icon", modifierClass].filter(Boolean).join(" ");
  icon.setAttribute("aria-hidden", "true");
  image.src = src;
  image.alt = "";
  image.className = "c-column__iconImage";

  icon.appendChild(image);

  return icon;
};

// 一覧カード内のいいねボタンを作る。
const createLikeButton = (plan) => {
  const button = document.createElement("button");
  const icon = document.createElement("span");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const count = document.createElement("span");
  const title = plan.title || "作成したしおり";
  const initialCount = getInitialLikeCount(plan);

  button.type = "button";
  button.className = "c-like__button";
  button.dataset.likeButton = "";
  button.dataset.likeId = getPublicTripLikeId(plan);
  button.dataset.likeCount = String(initialCount);
  button.setAttribute("aria-label", `${title}にいいねする`);

  icon.className = "c-like__icon";
  icon.setAttribute("aria-hidden", "true");

  svg.dataset.prefix = "far";
  svg.dataset.icon = "heart";
  svg.classList.add("c-like__svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("viewBox", "0 0 512 512");
  svg.setAttribute("aria-hidden", "true");

  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", HEART_ICON_PATH);

  count.className = "c-like__count";
  count.dataset.likeCountDisplay = "";
  count.textContent = String(initialCount);

  svg.appendChild(path);
  icon.appendChild(svg);
  button.append(icon, count);

  return button;
};

// 作成済みしおり1件分の一覧カードを作る。
const createTripItem = (plan) => {
  const item = document.createElement("li");
  const link = document.createElement("a");
  const image = document.createElement("img");
  const textBox = document.createElement("div");
  const title = document.createElement("h3");
  const infoList = document.createElement("div");
  const date = document.createElement("span");
  const visibility = document.createElement("span");
  const iconBox = document.createElement("div");

  item.className = "c-column__item";
  item.dataset.sortItem = "";
  item.dataset.sortDate = getSortDate(plan);
  item.dataset.sortLike = String(getInitialLikeCount(plan));
  item.dataset.planId = plan.id;

  link.href = `/create/plan.html?id=${encodeURIComponent(plan.id)}`;
  link.className = "c-column__link";

  image.src = getTripImageUrl(plan);
  image.className = "c-column__image";
  image.alt = plan.title || "作成したしおり";

  textBox.className = "c-column__textBox";
  title.className = "c-column__title";
  title.textContent = plan.title || "無題のしおり";

  infoList.className = "c-column__infoList";
  date.className = "c-column__date";
  date.textContent = formatDateText(plan.dateText);
  visibility.className = "c-column__public";
  visibility.dataset.planPublicToggle = "";
  visibility.setAttribute("role", "button");
  visibility.setAttribute("tabindex", "0");
  visibility.setAttribute("aria-label", "公開設定を切り替える");
  visibility.textContent = getPublicStatusText(plan.isPublic === true);

  iconBox.className = "c-column__iconBox";
  iconBox.append(
    createIcon("/src/assets/common/share-icon.svg", "u-share"),
    createIcon("/src/assets/common/delete-icon.svg", "u-delete"),
  );

  infoList.append(date, visibility);
  textBox.append(title, infoList);
  link.append(image, textBox, iconBox);
  item.appendChild(link);

  return item;
};

// 公開中のしおり1件分の一覧カードを作る。
const createPublicTripItem = (plan) => {
  const item = document.createElement("li");
  const link = document.createElement("a");
  const image = document.createElement("img");
  const textBox = document.createElement("div");
  const title = document.createElement("h3");
  const profileList = document.createElement("div");
  const profile = document.createElement("span");
  const profileImage = document.createElement("img");
  const date = document.createElement("span");
  const likeButton = createLikeButton(plan);
  const iconBox = document.createElement("div");

  item.className = "c-column__item";
  item.dataset.sortItem = "";
  item.dataset.sortDate = getSortDate(plan);
  item.dataset.sortLike = String(getInitialLikeCount(plan));
  item.dataset.planId = plan.id;

  link.href = `/create/plan.html?id=${encodeURIComponent(plan.id)}`;
  link.className = "c-column__link";

  image.src = getTripImageUrl(plan);
  image.className = "c-column__image";
  image.alt = plan.title || "作成したしおり";

  textBox.className = "c-column__textBox";
  title.className = "c-column__title";
  title.textContent = plan.title || "無題のしおり";

  profileList.className = "c-column__profileList";
  profile.className = "c-column__profile";
  profileImage.src = getTripImageUrl(plan);
  profileImage.alt = "";
  date.className = "c-column__date";
  date.textContent = formatDateText(plan.dateText);

  iconBox.className = "c-column__iconBox";
  iconBox.append(createIcon("/src/assets/common/share-icon.svg", "u-share"));

  profile.appendChild(profileImage);
  profileList.append(profile, date, likeButton);
  textBox.append(title, profileList);
  link.append(image, textBox, iconBox);
  item.appendChild(link);

  return item;
};

// 作成したしおりがない場合
const createEmptyItem = () => {
  const item = document.createElement("li");
  const message = document.createElement("p");

  item.className = "p-top__latestEmpty";
  message.className = "p-top__latestEmptyText";
  message.innerHTML =
    'まだしおりがありません。<a href="/create">新しいしおりを作成</a>';

  item.appendChild(message);

  return item;
};

// 公開中のしおりがない場合
const createPublicEmptyItem = () => {
  const item = document.createElement("li");
  const message = document.createElement("p");

  item.className = "p-top__latestEmpty";
  message.className = "p-top__latestEmptyText";
  message.textContent = "公開中のしおりがありません。";

  item.appendChild(message);

  return item;
};

// 指定されたしおりを localStorage の作成済み一覧から削除する。
const deleteStoredPlan = (planId) => {
  if (!planId) {
    return;
  }

  setStoredCreatedPlans(
    getStoredCreatedPlans().filter((plan) => {
      return plan?.id !== planId;
    }),
  );
};

// シェア対象カードのリンクから絶対 URL を組み立てる。
const getItemShareUrl = (shareButton) => {
  const link = shareButton.closest(".c-column__link");
  const href =
    link instanceof HTMLAnchorElement ? link.getAttribute("href") || "" : "";

  return new URL(href || window.location.href, window.location.origin).href;
};

// Clipboard API が使えない環境にも対応してテキストをコピーする。
const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");

  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  document.execCommand("copy");
  input.remove();
};

// シェア方法を選ぶモーダル要素を生成する。
const createShareModal = () => {
  const modal = document.createElement("div");
  const panel = document.createElement("div");
  const title = document.createElement("p");
  const text = document.createElement("p");
  const actions = document.createElement("div");
  const copyButton = document.createElement("button");
  const lineButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const status = document.createElement("p");

  modal.className = "c-shareModal";
  modal.hidden = true;
  modal.dataset.shareModal = "";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "share-modal-title");

  panel.className = "c-shareModal__panel";
  panel.dataset.shareModalPanel = "";

  title.id = "share-modal-title";
  title.className = "c-shareModal__title";
  title.textContent = "しおりをシェア";

  text.className = "c-shareModal__text";
  text.textContent = "共有方法を選択してください。";

  actions.className = "c-shareModal__actions";

  copyButton.type = "button";
  copyButton.className = "c-shareModal__button";
  copyButton.dataset.shareModalCopy = "";
  copyButton.textContent = "リンクをコピー";

  lineButton.type = "button";
  lineButton.className = "c-shareModal__button c-shareModal__button--line";
  lineButton.dataset.shareModalLine = "";
  lineButton.textContent = "LINEでシェア";

  closeButton.type = "button";
  closeButton.className = "c-shareModal__close";
  closeButton.dataset.shareModalClose = "";
  closeButton.textContent = "閉じる";

  status.className = "c-shareModal__status";
  status.dataset.shareModalStatus = "";
  status.setAttribute("aria-live", "polite");

  actions.append(copyButton, lineButton);
  panel.append(title, text, actions, status, closeButton);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  return modal;
};

// シェアアイコンからモーダルを開き、コピーや LINE 共有を実行する。
const setupShareModal = () => {
  const modal =
    document.querySelector("[data-share-modal]") || createShareModal();
  const copyButton = modal.querySelector("[data-share-modal-copy]");
  const lineButton = modal.querySelector("[data-share-modal-line]");
  const closeButton = modal.querySelector("[data-share-modal-close]");
  const status = modal.querySelector("[data-share-modal-status]");
  let shareUrl = "";

  const setStatus = (message) => {
    if (status instanceof HTMLElement) {
      status.textContent = message;
    }
  };

  const closeModal = () => {
    modal.hidden = true;
    shareUrl = "";
    setStatus("");
  };

  const openModal = (url) => {
    shareUrl = url;
    modal.hidden = false;
    setStatus("");

    if (copyButton instanceof HTMLButtonElement) {
      copyButton.focus();
    }
  };

  document.addEventListener("click", (event) => {
    const shareButton =
      event.target instanceof Element ? event.target.closest(".u-share") : null;

    if (!(shareButton instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openModal(getItemShareUrl(shareButton));
  });

  if (copyButton instanceof HTMLButtonElement) {
    copyButton.addEventListener("click", async () => {
      try {
        await copyText(shareUrl);
        setStatus("リンクをコピーしました。");
      } catch {
        setStatus("コピーできませんでした。");
      }
    });
  }

  if (lineButton instanceof HTMLButtonElement) {
    lineButton.addEventListener("click", () => {
      const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
        shareUrl,
      )}`;

      window.open(lineUrl, "_blank", "noopener,noreferrer");
    });
  }

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", closeModal);
  }

  modal.addEventListener("click", (event) => {
    const clickedPanel =
      event.target instanceof Element
        ? event.target.closest("[data-share-modal-panel]")
        : null;

    if (!clickedPanel) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.hidden && event.key === "Escape") {
      closeModal();
    }
  });
};

// 削除確認用のモーダル要素を生成する。
const createDeleteModal = () => {
  const modal = document.createElement("div");
  const panel = document.createElement("div");
  const title = document.createElement("p");
  const text = document.createElement("p");
  const actions = document.createElement("div");
  const cancelButton = document.createElement("button");
  const deleteButton = document.createElement("button");

  modal.className = "c-deleteModal";
  modal.hidden = true;
  modal.dataset.deleteModal = "";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "delete-modal-title");

  panel.className = "c-deleteModal__panel";
  panel.dataset.deleteModalPanel = "";

  title.id = "delete-modal-title";
  title.className = "c-deleteModal__title";
  title.textContent = "しおりを削除しますか？";

  text.className = "c-deleteModal__text";
  text.textContent = "削除したしおりは元に戻せません。";

  actions.className = "c-deleteModal__actions";

  cancelButton.type = "button";
  cancelButton.className = "c-deleteModal__button";
  cancelButton.dataset.deleteModalCancel = "";
  cancelButton.textContent = "キャンセル";

  deleteButton.type = "button";
  deleteButton.className =
    "c-deleteModal__button c-deleteModal__button--danger";
  deleteButton.dataset.deleteModalConfirm = "";
  deleteButton.textContent = "削除";

  actions.append(cancelButton, deleteButton);
  panel.append(title, text, actions);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  return modal;
};

// 削除アイコンから確認モーダルを開き、確定時にしおりを削除する。
const setupDeleteConfirm = () => {
  const modal =
    document.querySelector("[data-delete-modal]") || createDeleteModal();
  const confirmButton = modal.querySelector("[data-delete-modal-confirm]");
  const cancelButton = modal.querySelector("[data-delete-modal-cancel]");
  let pendingItem = null;

  const closeModal = () => {
    modal.hidden = true;
    pendingItem = null;
  };

  const openModal = (item) => {
    pendingItem = item;
    modal.hidden = false;

    if (confirmButton instanceof HTMLButtonElement) {
      confirmButton.focus();
    }
  };

  document.addEventListener("click", (event) => {
    const deleteButton =
      event.target instanceof Element
        ? event.target.closest(".u-delete")
        : null;

    if (!(deleteButton instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const item = deleteButton.closest("[data-sort-item]");

    if (!(item instanceof HTMLElement)) {
      return;
    }

    openModal(item);
  });

  if (cancelButton instanceof HTMLButtonElement) {
    cancelButton.addEventListener("click", closeModal);
  }

  if (confirmButton instanceof HTMLButtonElement) {
    confirmButton.addEventListener("click", () => {
      if (pendingItem instanceof HTMLElement) {
        deleteStoredPlan(pendingItem.dataset.planId);
        renderTopLatestTrips();
        renderTopPublicTrips();
      }

      closeModal();
    });
  }

  modal.addEventListener("click", (event) => {
    const clickedPanel =
      event.target instanceof Element
        ? event.target.closest("[data-delete-modal-panel]")
        : null;

    if (!clickedPanel) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.hidden && event.key === "Escape") {
      closeModal();
    }
  });
};

// TOP の公開ステータスラベルから公開・非公開を切り替える。
const setupPublicStatusToggle = () => {
  const toggleStatus = (target) => {
    const item = target.closest("[data-sort-item]");

    if (!(item instanceof HTMLElement)) {
      return;
    }

    const nextIsPublic = toggleStoredPlanPublicStatus(item.dataset.planId);

    if (nextIsPublic === null) {
      return;
    }

    target.textContent = getPublicStatusText(nextIsPublic);
    renderTopPublicTrips();
  };

  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest("[data-plan-public-toggle]")
        : null;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleStatus(target);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target.closest("[data-plan-public-toggle]")
        : null;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleStatus(target);
  });
};

// トップページのみんなのしおり一覧を公開中のしおりから描画する。
const renderTopPublicTrips = () => {
  const list = document.querySelector("[data-public-trips]");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const plans = getSortedPublicPlans(
    getStoredCreatedPlans().filter((plan) => {
      return plan && typeof plan.id === "string" && plan.isPublic === true;
    }),
  );

  list.textContent = "";

  if (plans.length === 0) {
    list.appendChild(createPublicEmptyItem());
    return;
  }

  plans.forEach((plan) => {
    list.appendChild(createPublicTripItem(plan));
  });
  notifyLikeButtonsUpdated();
};

// トップページの最新しおり一覧を localStorage の内容から描画する。
const renderTopLatestTrips = () => {
  const list = document.querySelector('[data-sort-list="latest-trips"]');

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const plans = getStoredCreatedPlans().filter((plan) => {
    return plan && typeof plan.id === "string";
  });

  list.textContent = "";

  if (plans.length === 0) {
    list.appendChild(createEmptyItem());
    return;
  }

  plans.forEach((plan) => {
    list.appendChild(createTripItem(plan));
  });
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      renderTopLatestTrips();
      renderTopPublicTrips();
      setupShareModal();
      setupDeleteConfirm();
      setupPublicStatusToggle();
      setupPublicTripSort();
    },
    {
      once: true,
    },
  );
} else {
  renderTopLatestTrips();
  renderTopPublicTrips();
  setupShareModal();
  setupDeleteConfirm();
  setupPublicStatusToggle();
  setupPublicTripSort();
}
