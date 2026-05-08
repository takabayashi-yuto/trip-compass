const SORT_LABELS = {
  desc: "新しい順",
  asc: "古い順",
};

// 並び替えメニューを閉じ、アクセシビリティ状態も更新する。
const closeDropdown = (root) => {
  const trigger = root.querySelector("[data-sort-trigger]");
  const menu = root.querySelector("[data-sort-menu]");

  if (
    !(trigger instanceof HTMLButtonElement) ||
    !(menu instanceof HTMLElement)
  ) {
    return;
  }

  trigger.setAttribute("aria-expanded", "false");
  menu.hidden = true;
};

// 並び替えメニューを開き、アクセシビリティ状態も更新する。
const openDropdown = (root) => {
  const trigger = root.querySelector("[data-sort-trigger]");
  const menu = root.querySelector("[data-sort-menu]");

  if (
    !(trigger instanceof HTMLButtonElement) ||
    !(menu instanceof HTMLElement)
  ) {
    return;
  }

  trigger.setAttribute("aria-expanded", "true");
  menu.hidden = false;
};

// data-sort-date の日時を使って一覧アイテムを昇順・降順に並べる。
const getSortedItems = (items, order) => {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.dataset.sortDate ?? "").getTime();
    const rightTime = new Date(right.dataset.sortDate ?? "").getTime();

    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return 0;
    }

    return order === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });
};

// 現在の並び順表示と選択中オプションの状態を更新する。
const updateSortState = (root, order) => {
  const currentLabel = root.querySelector("[data-sort-current]");
  const options = root.querySelectorAll("[data-sort-option]");

  root.dataset.sortOrder = order;

  if (currentLabel instanceof HTMLElement) {
    currentLabel.textContent = SORT_LABELS[order];
  }

  options.forEach((option) => {
    if (option instanceof HTMLButtonElement) {
      option.setAttribute(
        "aria-pressed",
        String(option.dataset.sortOption === order),
      );
    }
  });
};

// 1つの並び替え UI と対象リストを紐づけて操作できるようにする。
const setupSort = (root) => {
  const sortGroup = root.dataset.sort;
  const trigger = root.querySelector("[data-sort-trigger]");
  const options = root.querySelectorAll("[data-sort-option]");

  if (
    !sortGroup ||
    !(trigger instanceof HTMLButtonElement) ||
    options.length === 0
  ) {
    return;
  }

  const list = document.querySelector(`[data-sort-list="${sortGroup}"]`);

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const applySort = (order) => {
    const items = Array.from(list.querySelectorAll("[data-sort-item]"));
    const sortedItems = getSortedItems(items, order);

    sortedItems.forEach((item) => {
      list.appendChild(item);
    });

    updateSortState(root, order);
    closeDropdown(root);
  };

  applySort(root.dataset.sortOrder === "asc" ? "asc" : "desc");

  trigger.addEventListener("click", () => {
    const isExpanded = trigger.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
      closeDropdown(root);
      return;
    }

    openDropdown(root);
  });

  options.forEach((option) => {
    if (!(option instanceof HTMLButtonElement)) {
      return;
    }

    option.addEventListener("click", () => {
      const nextOrder = option.dataset.sortOption === "asc" ? "asc" : "desc";
      applySort(nextOrder);
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node) || root.contains(event.target)) {
      return;
    }

    closeDropdown(root);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown(root);
      trigger.focus();
    }
  });
};

// ページ内の並び替え UI をすべて初期化する。
const initSort = () => {
  const sortRoots = document.querySelectorAll("[data-sort]");

  sortRoots.forEach((root) => {
    if (root instanceof HTMLElement) {
      setupSort(root);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSort, { once: true });
} else {
  initSort();
}
