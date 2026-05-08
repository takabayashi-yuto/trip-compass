const LIKE_STATUS_STORAGE_KEY = "trip-compass-liked-items";
const LIKE_COUNT_STORAGE_KEY = "trip-compass-like-counts";

// localStorage から JSON を安全に読み込む。
const readStorage = (key) => {
  try {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

// localStorage へ JSON を安全に保存する。
const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep the UI usable.
  }
};

const likedItems = readStorage(LIKE_STATUS_STORAGE_KEY);
const likeCounts = readStorage(LIKE_COUNT_STORAGE_KEY);

// いいね数、押下状態、読み上げラベルをボタンに反映する。
const renderLikeButton = (button, count, liked) => {
  const countDisplay = button.querySelector("[data-like-count-display]");
  const label = button.dataset.likeLabel ?? "このしおり";

  if (countDisplay instanceof HTMLElement) {
    countDisplay.textContent = String(count);
  }

  button.classList.toggle("is-liked", liked);
  button.setAttribute("aria-pressed", String(liked));
  button.setAttribute(
    "aria-label",
    liked ? `${label}のいいねを取り消す` : `${label}にいいねする`,
  );
};

// 個別のいいねボタンに状態復元とクリック時の増減処理を設定する。
const setupLikeButton = (button) => {
  const likeId = button.dataset.likeId;
  const initialCount = Number.parseInt(button.dataset.likeCount ?? "0", 10);

  if (!likeId || Number.isNaN(initialCount)) {
    return;
  }

  const label = button.getAttribute("aria-label")?.replace(/にいいねする$/, "");

  if (label) {
    button.dataset.likeLabel = label;
  }

  let count =
    typeof likeCounts[likeId] === "number" ? likeCounts[likeId] : initialCount;
  let liked = likedItems[likeId] === true;

  renderLikeButton(button, count, liked);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (liked) {
      count = Math.max(0, count - 1);
      liked = false;
      likedItems[likeId] = false;
    } else {
      count += 1;
      liked = true;
      likedItems[likeId] = true;
    }
    likeCounts[likeId] = count;

    writeStorage(LIKE_STATUS_STORAGE_KEY, likedItems);
    writeStorage(LIKE_COUNT_STORAGE_KEY, likeCounts);
    renderLikeButton(button, count, liked);
  });
};

// ページ内のすべてのいいねボタンを初期化する。
const initLikeButtons = () => {
  const buttons = document.querySelectorAll("[data-like-button]");

  buttons.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      setupLikeButton(button);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLikeButtons, {
    once: true,
  });
} else {
  initLikeButtons();
}
