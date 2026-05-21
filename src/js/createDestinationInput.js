import { findDestinationSuggestions } from "./destinationSuggestion.js";

const CREATE_PLAN_DESTINATIONS_STORAGE_KEY =
  "tripCompassCreatePlanDestinations";
const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const CREATE_PLAN_CITY_IMAGE_PATH = "/src/assets/cities/";
const CREATE_PLAN_CITY_IMAGE_SUFFIX = "-edit.webp";
const createPlanCityImageUrls = import.meta.glob(
  "../assets/cities/*-edit.webp",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);
const destinationImageIdPattern = /^[a-z0-9-]+$/;
const planKvImageOverlay =
  "linear-gradient(rgba(8, 21, 25, 0.18) 0%, rgba(8, 21, 25, 0.72) 100%)";

// 保存データが旅行先として最低限必要な形か判定する。
const isStoredDestination = (destination) => {
  return (
    destination &&
    typeof destination.id === "string" &&
    typeof destination.name === "string"
  );
};

// 新規作成画面で選んだ旅行先を sessionStorage から取得する。
const getStoredCreatePlanDestinations = () => {
  try {
    const storedDestinations = JSON.parse(
      sessionStorage.getItem(CREATE_PLAN_DESTINATIONS_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(storedDestinations)) {
      return [];
    }

    return storedDestinations.filter(isStoredDestination);
  } catch {
    return [];
  }
};

// 新規作成画面で選んだ旅行先を sessionStorage に保存する。
const setStoredCreatePlanDestinations = (destinations) => {
  try {
    sessionStorage.setItem(
      CREATE_PLAN_DESTINATIONS_STORAGE_KEY,
      JSON.stringify(destinations),
    );
  } catch {
    return;
  }
};

// 新規作成開始時に前回の旅行先選択をクリアする。
const clearStoredCreatePlanDestinations = () => {
  try {
    sessionStorage.removeItem(CREATE_PLAN_DESTINATIONS_STORAGE_KEY);
  } catch {
    return;
  }
};

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

// URL の id パラメータから編集中の作成済みしおりを取得する。
const getPlanFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get("id");

  if (!planId || params.get("new") === "1") {
    return null;
  }

  return (
    getStoredCreatedPlans().find((plan) => {
      return plan?.id === planId;
    }) || null
  );
};

// 診断結果などから渡された URL パラメータを、初期選択の旅行先に変換する。
const getDestinationFromCreateUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const destinationValue =
    params.get("destination") ||
    params.get("destinationId") ||
    params.get("city");

  if (!destinationValue) {
    return null;
  }

  return findDestinationSuggestions(destinationValue, 1)[0] || null;
};

// 編集中しおりまたは新規作成中の保存値から現在の旅行先を取得する。
const getActivePlanDestinations = () => {
  const plan = getPlanFromUrl();

  if (Array.isArray(plan?.destinations)) {
    return plan.destinations.filter(isStoredDestination);
  }

  return getStoredCreatePlanDestinations();
};

// 旅行先 ID に対応するキービジュアル画像 URL を返す。
const getDestinationImageUrl = (destination) => {
  if (!destinationImageIdPattern.test(destination.id)) {
    return "";
  }

  const imageFileName = `${destination.id}${CREATE_PLAN_CITY_IMAGE_SUFFIX}`;
  const imageModulePath = `../assets/cities/${imageFileName}`;

  return (
    createPlanCityImageUrls[imageModulePath] ||
    `${CREATE_PLAN_CITY_IMAGE_PATH}${imageFileName}`
  );
};

// しおり編集画面のキービジュアル背景画像を差し替える。
const setPlanKvBackgroundImage = (kv, imageUrl) => {
  kv.style.backgroundImage = `${planKvImageOverlay}, url("${imageUrl}")`;
};

// 選択済み旅行先のチップと送信用 hidden input を描画する。
const renderSelectedDestinations = (container, destinations) => {
  container.textContent = "";

  if (destinations.length === 0) {
    container.hidden = true;
    return;
  }

  destinations.forEach((destination) => {
    const chip = document.createElement("span");
    const name = document.createElement("span");
    const removeButton = document.createElement("button");
    const hiddenInput = document.createElement("input");

    chip.className = "p-create__selectedDestinationChip";

    name.className = "p-create__selectedDestinationName";
    name.textContent = destination.name;

    removeButton.type = "button";
    removeButton.className = "p-create__selectedDestinationRemove";
    removeButton.dataset.destinationRemoveId = destination.id;
    removeButton.setAttribute("aria-label", `${destination.name}を削除`);

    hiddenInput.type = "hidden";
    hiddenInput.name = "destinations[]";
    hiddenInput.value = destination.name;

    chip.append(name, removeButton);
    container.append(chip, hiddenInput);
  });

  container.hidden = false;
};

// 入力内容に応じた旅行先候補リストを描画する。
const renderSuggestions = (list, input, suggestions) => {
  list.textContent = "";

  if (suggestions.length === 0) {
    list.hidden = true;
    return;
  }

  suggestions.forEach((destination) => {
    const item = document.createElement("li");
    const button = document.createElement("button");

    item.className = "p-create__suggestionItem";
    button.type = "button";
    button.className = "p-create__suggestionButton";
    button.dataset.destinationId = destination.id;
    button.textContent = destination.name;

    item.appendChild(button);
    list.appendChild(item);
  });

  list.hidden = false;
};

// 新規作成画面の旅行先入力、候補表示、選択済みチップを管理する。
const setupCreateDestinationInput = () => {
  const input = document.querySelector("[data-destination-input]");
  const list = document.querySelector("[data-destination-suggestions]");
  const selected = document.querySelector("[data-destination-selected]");

  if (
    !(input instanceof HTMLInputElement) ||
    !(list instanceof HTMLElement) ||
    !(selected instanceof HTMLElement)
  ) {
    return;
  }

  clearStoredCreatePlanDestinations();
  const initialDestination = getDestinationFromCreateUrl();
  let selectedDestinations = initialDestination ? [initialDestination] : [];

  setStoredCreatePlanDestinations(selectedDestinations);
  renderSelectedDestinations(selected, selectedDestinations);

  const updateSuggestions = () => {
    const suggestions = findDestinationSuggestions(input.value);
    renderSuggestions(list, input, suggestions);
  };

  list.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-destination-id]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const destination = findDestinationSuggestions(
      button.dataset.destinationId,
      1,
    )[0];

    if (!destination) {
      return;
    }

    if (!selectedDestinations.some((item) => item.id === destination.id)) {
      selectedDestinations = [...selectedDestinations, destination];
    }

    input.value = "";
    list.hidden = true;
    setStoredCreatePlanDestinations(selectedDestinations);
    renderSelectedDestinations(selected, selectedDestinations);
    input.focus();
  });

  selected.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-destination-remove-id]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    selectedDestinations = selectedDestinations.filter((destination) => {
      return destination.id !== button.dataset.destinationRemoveId;
    });

    setStoredCreatePlanDestinations(selectedDestinations);
    renderSelectedDestinations(selected, selectedDestinations);
  });

  input.addEventListener("input", updateSuggestions);
  input.addEventListener("focus", updateSuggestions);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    if (!input.contains(event.target) && !list.contains(event.target)) {
      list.hidden = true;
    }
  });
};

// 選択済み旅行先から、しおりタイトルの初期値を設定する。
const setupPlanDestinationTitle = () => {
  const input = document.querySelector(".p-plan__kvInput");

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const destinations = getActivePlanDestinations();

  if (destinations.length === 0) {
    return;
  }

  const destinationNames = destinations
    .map((destination) => destination.name)
    .join("・");

  input.value = `${destinationNames}への旅行`;
};

// 選択済み旅行先から、しおりキービジュアルの初期背景を設定する。
const setupPlanKvBackground = () => {
  const kv = document.querySelector(".p-plan__kv");

  if (!(kv instanceof HTMLElement)) {
    return;
  }

  const [firstDestination] = getActivePlanDestinations();

  if (!firstDestination) {
    return;
  }

  const imageUrl = getDestinationImageUrl(firstDestination);

  if (!imageUrl) {
    return;
  }

  setPlanKvBackgroundImage(kv, imageUrl);
};

// カメラボタン経由で選んだ画像をしおりキービジュアルに反映する。
const setupPlanCameraImageInput = () => {
  const kv = document.querySelector(".p-plan__kv");
  const cameraInput = document.querySelector(".p-plan__cameraInput");
  const cameraButton = document.querySelector(".p-plan__camera");

  if (
    !(kv instanceof HTMLElement) ||
    !(cameraInput instanceof HTMLInputElement) ||
    !(cameraButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  let selectedImageUrl = "";

  const revokeSelectedImageUrl = () => {
    if (!selectedImageUrl) {
      return;
    }

    URL.revokeObjectURL(selectedImageUrl);
    selectedImageUrl = "";
  };

  cameraButton.addEventListener("click", () => {
    cameraInput.click();
  });

  cameraInput.addEventListener("change", () => {
    const [file] = cameraInput.files || [];

    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    revokeSelectedImageUrl();
    selectedImageUrl = URL.createObjectURL(file);
    setPlanKvBackgroundImage(kv, selectedImageUrl);
  });

  window.addEventListener("pagehide", revokeSelectedImageUrl);
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupCreateDestinationInput();
      setupPlanDestinationTitle();
      setupPlanKvBackground();
      setupPlanCameraImageInput();
    },
    {
      once: true,
    },
  );
} else {
  setupCreateDestinationInput();
  setupPlanDestinationTitle();
  setupPlanKvBackground();
  setupPlanCameraImageInput();
}
