const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const CREATE_PLAN_CITY_IMAGE_SUFFIX = "-edit.webp";
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

// 作成済みしおり一覧を localStorage に保存する。
const setStoredCreatedPlans = (plans) => {
  try {
    localStorage.setItem(CREATED_PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    return;
  }
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
  visibility.textContent = "非公開";

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
        pendingItem.remove();

        const list = document.querySelector('[data-sort-list="latest-trips"]');

        if (
          list instanceof HTMLElement &&
          !list.querySelector("[data-sort-item]")
        ) {
          list.textContent = "";
          list.appendChild(createEmptyItem());
        }
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
      setupShareModal();
      setupDeleteConfirm();
    },
    {
      once: true,
    },
  );
} else {
  renderTopLatestTrips();
  setupShareModal();
  setupDeleteConfirm();
}
