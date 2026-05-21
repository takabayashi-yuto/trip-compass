const PLAN_DRAFT_STORAGE_KEY = "tripCompassPlanDraft";
const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const CREATE_PLAN_DESTINATIONS_STORAGE_KEY =
  "tripCompassCreatePlanDestinations";
const SPOT_SEARCH_CACHE_STORAGE_KEY = "tripCompassSpotSearchCache";
const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 7;
const MAX_SEARCH_CACHE_ENTRIES = 80;
const DEFAULT_COST_CURRENCY = "JPY";
const COST_CURRENCIES = [
  {
    code: "JPY",
    label: "円",
    countries: ["日本"],
  },
  {
    code: "KRW",
    label: "ウォン",
    countries: ["韓国"],
  },
  {
    code: "TWD",
    label: "台湾ドル",
    countries: ["台湾"],
  },
];
const COST_PURPOSES = [
  {
    value: "flight",
    label: "フライト",
  },
  {
    value: "food",
    label: "食費",
  },
  {
    value: "hotel",
    label: "宿泊費",
  },
  {
    value: "transport",
    label: "交通費",
  },
  {
    value: "activity",
    label: "観光・体験",
  },
  {
    value: "shopping",
    label: "買い物",
  },
  {
    value: "other",
    label: "その他",
  },
];
const SELECTED_SPOT_IMAGES = [
  // 日本
  // 京都府
  {
    name: "清水寺",
    src: "/src/assets/spots/kiyomizu.jpg",
    alt: "清水寺",
    addressIncludes: ["清水一丁目"],
  },
  // {
  //   names: ["台北101", "Taipei 101"],
  //   src: "/src/assets/spots/taipei-101.webp",
  // },
];
let spotSearchCache = null;

const isStoredDestination = (destination) => {
  return (
    destination &&
    typeof destination.id === "string" &&
    typeof destination.name === "string"
  );
};

const getStoredJson = (storage, key, fallback) => {
  try {
    return JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const getPlanFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get("id");

  if (params.get("new") === "1") {
    return null;
  }

  if (!planId) {
    return getStoredJson(localStorage, PLAN_DRAFT_STORAGE_KEY, null);
  }

  const plans = getStoredJson(localStorage, CREATED_PLANS_STORAGE_KEY, []);

  return Array.isArray(plans)
    ? plans.find((plan) => plan?.id === planId) || null
    : null;
};

const getActiveDestinationNames = () => {
  return getActiveDestinations().map((destination) => {
    return destination.name;
  });
};

const getActiveDestinations = () => {
  const plan = getPlanFromUrl();
  const destinations = Array.isArray(plan?.destinations)
    ? plan.destinations
    : getStoredJson(sessionStorage, CREATE_PLAN_DESTINATIONS_STORAGE_KEY, []);

  return Array.isArray(destinations)
    ? destinations.filter(isStoredDestination)
    : [];
};

const createSearchQueries = (query) => {
  const destinationNames = [
    ...new Set(
      getActiveDestinationNames()
        .map((destinationName) => destinationName.trim())
        .filter(Boolean),
    ),
  ].slice(0, 2);
  const queries = [query];

  destinationNames.forEach((destinationName) => {
    queries.push(`${query} ${destinationName}`);
  });

  return [...new Set(queries)];
};

const createSearchCacheKey = (query) => {
  return JSON.stringify(
    createSearchQueries(query).map((searchQuery) => {
      return searchQuery.trim().toLowerCase();
    }),
  );
};

const normalizeCachedPlace = (place) => {
  if (
    !place ||
    typeof place.id !== "string" ||
    typeof place.name !== "string"
  ) {
    return null;
  }

  return {
    id: place.id,
    name: place.name,
    meta: typeof place.meta === "string" ? place.meta : "",
    address: typeof place.address === "string" ? place.address : "",
  };
};

const clonePlaces = (places) => {
  return Array.isArray(places)
    ? places.map(normalizeCachedPlace).filter(Boolean)
    : [];
};

const getSpotSearchCache = () => {
  if (spotSearchCache instanceof Map) {
    return spotSearchCache;
  }

  try {
    const entries = JSON.parse(
      sessionStorage.getItem(SPOT_SEARCH_CACHE_STORAGE_KEY) || "[]",
    );

    spotSearchCache = new Map(
      Array.isArray(entries)
        ? entries
            .filter((entry) => {
              return (
                Array.isArray(entry) &&
                typeof entry[0] === "string" &&
                Array.isArray(entry[1])
              );
            })
            .map(([key, places]) => [key, clonePlaces(places)])
        : [],
    );
  } catch {
    spotSearchCache = new Map();
  }

  return spotSearchCache;
};

const saveSpotSearchCache = () => {
  try {
    sessionStorage.setItem(
      SPOT_SEARCH_CACHE_STORAGE_KEY,
      JSON.stringify([...getSpotSearchCache().entries()]),
    );
  } catch {
    return;
  }
};

const getCachedPlaces = (cacheKey) => {
  const cache = getSpotSearchCache();
  const places = cache.get(cacheKey);

  if (!places) {
    return null;
  }

  cache.delete(cacheKey);
  cache.set(cacheKey, places);
  return clonePlaces(places);
};

const setCachedPlaces = (cacheKey, places) => {
  const cache = getSpotSearchCache();

  cache.delete(cacheKey);
  cache.set(cacheKey, clonePlaces(places));

  while (cache.size > MAX_SEARCH_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }

  saveSpotSearchCache();
};

const getPlaceName = (place) => {
  if (typeof place.name === "string" && place.name.trim()) {
    return place.name.trim();
  }

  return String(place.display_name || "")
    .split(",")[0]
    .trim();
};

const getPlaceMeta = (place) => {
  const parts = String(place.display_name || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d{3}-?\d{4}$/.test(part)); // 郵便番号を除外

  return parts.slice(-4).join(" / ");
};

const getPlaceAddress = (place) => {
  return String(place.display_name || "").trim();
};

const normalizePlace = (place) => {
  const name = getPlaceName(place);

  if (!name) {
    return null;
  }

  return {
    id: String(place.place_id || place.display_name || name),
    name,
    meta: getPlaceMeta(place),
    address: getPlaceAddress(place),
  };
};

const normalizeSpotImageText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const getSelectedSpotImage = (place) => {
  const placeId = String(place?.id || "");
  const placeName = normalizeSpotImageText(place?.name);
  const placeAddress = normalizeSpotImageText(
    [place?.address, place?.meta].filter(Boolean).join(" "),
  );

  return (
    SELECTED_SPOT_IMAGES.find((spotImage) => {
      if (!spotImage || typeof spotImage.src !== "string") {
        return false;
      }

      if (typeof spotImage.id === "string" && spotImage.id === placeId) {
        return true;
      }

      const names = Array.isArray(spotImage.names)
        ? spotImage.names
        : [spotImage.name];

      const isNameMatched = names.some((name) => {
        return normalizeSpotImageText(name) === placeName;
      });

      if (!isNameMatched) {
        return false;
      }

      const addressKeywords = [
        ...(Array.isArray(spotImage.addressIncludes)
          ? spotImage.addressIncludes
          : []),
        ...(Array.isArray(spotImage.metaIncludes)
          ? spotImage.metaIncludes
          : []),
      ];

      if (addressKeywords.length === 0) {
        return true;
      }

      return addressKeywords.every((keyword) => {
        return placeAddress.includes(normalizeSpotImageText(keyword));
      });
    }) || null
  );
};

const fetchPlaces = async (query, signal) => {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: String(MAX_SUGGESTIONS),
    addressdetails: "1",
    "accept-language": "ja,en",
  });

  const response = await fetch(`${NOMINATIM_SEARCH_ENDPOINT}?${params}`, {
    signal,
  });

  if (!response.ok) {
    return [];
  }

  const results = await response.json();

  if (!Array.isArray(results)) {
    return [];
  }

  return results.map(normalizePlace).filter(Boolean);
};

const searchPlaces = async (query, signal) => {
  const cacheKey = createSearchCacheKey(query);
  const cachedPlaces = getCachedPlaces(cacheKey);

  if (cachedPlaces) {
    return cachedPlaces;
  }

  const places = [];
  const seenPlaceIds = new Set();

  for (const searchQuery of createSearchQueries(query)) {
    const results = await fetchPlaces(searchQuery, signal);

    results.forEach((place) => {
      if (seenPlaceIds.has(place.id)) {
        return;
      }

      seenPlaceIds.add(place.id);
      places.push(place);
    });
  }

  const limitedPlaces = places.slice(0, MAX_SUGGESTIONS);

  setCachedPlaces(cacheKey, limitedPlaces);
  return limitedPlaces;
};

const hideSuggestions = (list, input) => {
  list.hidden = true;
  input.setAttribute("aria-expanded", "false");
};

const renderSuggestions = (list, input, places) => {
  list.textContent = "";

  if (places.length === 0) {
    hideSuggestions(list, input);
    return;
  }

  places.forEach((place) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const name = document.createElement("span");

    item.className = "p-plan__spotSuggestionItem";
    button.type = "button";
    button.className = "p-plan__spotSuggestionButton";
    button.dataset.placeId = place.id;
    name.className = "p-plan__spotSuggestionName";
    name.textContent = place.name;
    button.appendChild(name);

    if (place.meta) {
      const meta = document.createElement("span");
      meta.className = "p-plan__spotSuggestionMeta";
      meta.textContent = place.meta;
      button.appendChild(meta);
    }

    item.appendChild(button);
    list.appendChild(item);
  });

  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
};

const getDragAfterSpot = (spotList, y) => {
  const draggableSpots = [
    ...spotList.querySelectorAll(".p-plan__selectedSpot:not(.is-dragging)"),
  ];

  return draggableSpots.reduce(
    (closest, spot) => {
      const box = spot.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset,
          spot,
        };
      }

      return closest;
    },
    {
      offset: Number.NEGATIVE_INFINITY,
      spot: null,
    },
  ).spot;
};

const selectedSpotNumberSymbols = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
];
const selectedSpotTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";

  return `${hour}:${minute}`;
});

const formatSelectedSpotNumber = (index) => {
  return selectedSpotNumberSymbols[index] || `${index + 1}.`;
};

const updateSelectedSpotNumbers = (spotList) => {
  [...spotList.querySelectorAll(".p-plan__selectedSpotNumber")].forEach(
    (number, index) => {
      number.textContent = formatSelectedSpotNumber(index);
    },
  );
};

const createSelectedSpotKey = (input, placeId) => {
  return `${input.dataset.planDayKey || "day"}::${placeId}`;
};

const getSelectedSpotListDayKey = (spotList) => {
  const dateRelative = spotList.nextElementSibling;
  const input =
    dateRelative instanceof HTMLElement
      ? dateRelative.querySelector("[data-plan-spot-input]")
      : null;

  return input instanceof HTMLInputElement
    ? input.dataset.planDayKey || "day"
    : spotList.dataset.planDayKey || "day";
};

const collectSelectedSpots = () => {
  return [...document.querySelectorAll(".p-plan__selectedSpotList")].flatMap(
    (spotList) => {
      if (!(spotList instanceof HTMLUListElement)) {
        return [];
      }

      const dayKey = getSelectedSpotListDayKey(spotList);

      return [...spotList.querySelectorAll(".p-plan__selectedSpot")]
        .map((spot) => {
          if (!(spot instanceof HTMLElement)) {
            return null;
          }

          return {
            dayKey,
            id: spot.dataset.selectedPlaceId || "",
            name: spot.dataset.selectedPlaceName || "",
            meta: spot.dataset.selectedPlaceMeta || "",
            address: spot.dataset.selectedPlaceAddress || "",
            startTime: spot.dataset.selectedSpotStartTime || "",
            endTime: spot.dataset.selectedSpotEndTime || "",
            costAmount: spot.dataset.selectedSpotCostAmount || "",
            costCurrency:
              spot.dataset.selectedSpotCostCurrency || DEFAULT_COST_CURRENCY,
            costPurpose: spot.dataset.selectedSpotCostPurpose || "",
            link: spot.dataset.selectedSpotLink || "",
          };
        })
        .filter((spot) => {
          return spot && spot.id && spot.name;
        });
    },
  );
};

const dispatchSelectedSpotsChange = () => {
  document.dispatchEvent(
    new CustomEvent("tripCompassPlanSelectedSpotsChange", {
      detail: {
        selectedSpots: collectSelectedSpots(),
      },
    }),
  );
};

const findPlanSpotInputByDayKey = (dayKey) => {
  return [...document.querySelectorAll("[data-plan-spot-input]")].find(
    (input) => {
      return (
        input instanceof HTMLInputElement && input.dataset.planDayKey === dayKey
      );
    },
  );
};

const renderStoredSelectedSpots = (selectedSpots) => {
  document.querySelectorAll(".p-plan__selectedSpotList").forEach((spotList) => {
    spotList.remove();
  });

  selectedSpots.forEach((spot) => {
    const input = findPlanSpotInputByDayKey(spot.dayKey);

    if (input instanceof HTMLInputElement) {
      insertSelectedSpot(input, spot);
    }
  });
};

const formatSelectedSpotTime = (spot) => {
  const startTime = spot.dataset.selectedSpotStartTime || "";
  const endTime = spot.dataset.selectedSpotEndTime || "";

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  return startTime || endTime || "";
};

const updateSelectedSpotTimeButton = (spot) => {
  const button = spot.querySelector("[data-selected-spot-time]");
  const selectedTime = formatSelectedSpotTime(spot);

  if (button instanceof HTMLButtonElement) {
    const text = button.querySelector(".p-plan__selectedSpotTimeButtonText");
    const icon = button.querySelector(".p-plan__selectedSpotTimeButtonIcon");
    const hasTime = Boolean(selectedTime);

    if (text instanceof HTMLElement) {
      text.textContent = selectedTime || "予定時刻を追加";
    }
    if (icon instanceof HTMLImageElement) {
      icon.src = hasTime
        ? "/src/assets/common/clock-icon-white.svg"
        : "/src/assets/common/clock-icon-gray.svg";
    }
    button.classList.toggle("has-time", hasTime);
  }
};

const createSelectedSpotTimeSelect = (value, field) => {
  const select = document.createElement("select");
  const emptyOption = document.createElement("option");

  select.className = "p-plan__selectedSpotTimeInput";
  select.dataset.selectedSpotTimeField = field;
  emptyOption.value = "";
  emptyOption.textContent = "--:--";
  select.appendChild(emptyOption);

  selectedSpotTimeOptions.forEach((time) => {
    const option = document.createElement("option");

    option.value = time;
    option.textContent = time;
    select.appendChild(option);
  });

  select.value = selectedSpotTimeOptions.includes(value) ? value : "";

  return select;
};

const getAvailableCostCurrencies = () => {
  const destinationCountries = new Set(
    getActiveDestinations()
      .map((destination) => destination.country)
      .filter(Boolean),
  );
  const currencies = [
    COST_CURRENCIES.find((currency) => {
      return currency.code === DEFAULT_COST_CURRENCY;
    }),
    ...COST_CURRENCIES.filter((currency) => {
      return (
        currency.code !== DEFAULT_COST_CURRENCY &&
        currency.countries.some((country) => destinationCountries.has(country))
      );
    }),
  ].filter(Boolean);

  return currencies.length > 0 ? currencies : COST_CURRENCIES.slice(0, 1);
};

const getCostCurrencyLabel = (currencyCode) => {
  return (
    COST_CURRENCIES.find((currency) => currency.code === currencyCode)?.label ||
    COST_CURRENCIES[0].label
  );
};

const getCostPurposeLabel = (purposeValue) => {
  return (
    COST_PURPOSES.find((purpose) => purpose.value === purposeValue)?.label || ""
  );
};

const formatSelectedSpotCostAmount = (amount) => {
  const trimmedAmount = String(amount || "").trim();

  if (!trimmedAmount) {
    return "";
  }

  const [integerPart, decimalPart] = trimmedAmount.split(".");

  if (
    !/^\d+$/.test(integerPart) ||
    (decimalPart !== undefined && !/^\d+$/.test(decimalPart))
  ) {
    return trimmedAmount;
  }

  const formattedIntegerPart = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  return decimalPart === undefined
    ? formattedIntegerPart
    : `${formattedIntegerPart}.${decimalPart}`;
};

const formatSelectedSpotCost = (spot) => {
  const amount = spot.dataset.selectedSpotCostAmount || "";

  if (!amount) {
    return "";
  }

  return `${formatSelectedSpotCostAmount(amount)} ${getCostCurrencyLabel(
    spot.dataset.selectedSpotCostCurrency || DEFAULT_COST_CURRENCY,
  )}`;
};

const updateSelectedSpotCostButton = (spot) => {
  const button = spot.querySelector("[data-selected-spot-cost]");
  const selectedCost = formatSelectedSpotCost(spot);

  if (button instanceof HTMLButtonElement) {
    const text = button.querySelector(".p-plan__selectedSpotCostButtonText");
    const icon = button.querySelector(".p-plan__selectedSpotCostButtonIcon");
    const hasCost = Boolean(selectedCost);

    if (text instanceof HTMLElement) {
      text.textContent = selectedCost || "費用を追加";
    }

    if (icon instanceof HTMLImageElement) {
      icon.src = hasCost
        ? "/src/assets/common/pay-icon-white.svg"
        : "/src/assets/common/pay-icon-gray.svg";
    }

    button.classList.toggle("has-cost", hasCost);
  }
};

const getSelectedSpotLinkLabel = (link) => {
  const trimmedLink = String(link || "").trim();

  if (!trimmedLink) {
    return "";
  }

  try {
    const url = new URL(trimmedLink);

    return url.hostname || trimmedLink;
  } catch {
    return trimmedLink;
  }
};

const getSelectedSpotLinkHref = (link) => {
  const trimmedLink = String(link || "").trim();

  if (!trimmedLink) {
    return "";
  }

  try {
    const url = new URL(trimmedLink);

    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch {
    if (!trimmedLink.includes(".") || /\s/.test(trimmedLink)) {
      return "";
    }

    try {
      const url = new URL(`https://${trimmedLink}`);

      return url.href;
    } catch {
      return "";
    }
  }
};

const updateSelectedSpotLinkOpenLink = (spot) => {
  const openLink = spot.querySelector("[data-selected-spot-link-open]");

  if (!(openLink instanceof HTMLAnchorElement)) {
    return;
  }

  const href = getSelectedSpotLinkHref(spot.dataset.selectedSpotLink || "");

  if (href) {
    openLink.href = href;
  } else {
    openLink.removeAttribute("href");
  }

  openLink.hidden = !href;
};

const updateSelectedSpotLinkButton = (spot) => {
  const button = spot.querySelector("[data-selected-spot-link]");
  const selectedLink = spot.dataset.selectedSpotLink || "";

  if (button instanceof HTMLButtonElement) {
    const text = button.querySelector(".p-plan__selectedLinkButtonText");
    const hasLink = Boolean(selectedLink);

    if (text instanceof HTMLElement) {
      text.textContent =
        getSelectedSpotLinkLabel(selectedLink) || "関連リンクを追加";
    }

    button.classList.toggle("has-link", hasLink);
  }

  updateSelectedSpotLinkOpenLink(spot);
};

const getSelectedSpotCostPopupValues = (popup) => {
  const amountInput = popup.querySelector("[data-selected-spot-cost-amount]");
  const currencySelect = popup.querySelector(
    "[data-selected-spot-cost-currency]",
  );
  const purposeSelect = popup.querySelector(
    "[data-selected-spot-cost-purpose]",
  );

  return {
    costAmount:
      amountInput instanceof HTMLInputElement ? amountInput.value : "",
    costCurrency:
      currencySelect instanceof HTMLSelectElement
        ? currencySelect.value
        : DEFAULT_COST_CURRENCY,
    costPurpose:
      purposeSelect instanceof HTMLSelectElement ? purposeSelect.value : "",
  };
};

const resetSelectedSpotCostPopup = (spot) => {
  const amountInput = spot.querySelector("[data-selected-spot-cost-amount]");
  const currencySelect = spot.querySelector(
    "[data-selected-spot-cost-currency]",
  );
  const purposeSelect = spot.querySelector("[data-selected-spot-cost-purpose]");

  if (amountInput instanceof HTMLInputElement) {
    amountInput.value = spot.dataset.selectedSpotCostAmount || "";
  }

  if (currencySelect instanceof HTMLSelectElement) {
    currencySelect.value =
      spot.dataset.selectedSpotCostCurrency || DEFAULT_COST_CURRENCY;
  }

  if (purposeSelect instanceof HTMLSelectElement) {
    purposeSelect.value = spot.dataset.selectedSpotCostPurpose || "";
  }
};

const saveSelectedSpotCostPopup = (spot, popup) => {
  const { costAmount, costCurrency, costPurpose } =
    getSelectedSpotCostPopupValues(popup);

  spot.dataset.selectedSpotCostAmount = costAmount;
  spot.dataset.selectedSpotCostCurrency = costCurrency || DEFAULT_COST_CURRENCY;
  spot.dataset.selectedSpotCostPurpose = costPurpose;
  updateSelectedSpotCostButton(spot);
  dispatchSelectedSpotsChange();
};

const closeSelectedSpotCostPopup = (popup, { saveIfAny = false } = {}) => {
  const spot = popup.closest(".p-plan__selectedSpot");

  if (!(popup instanceof HTMLElement) || !(spot instanceof HTMLElement)) {
    return;
  }

  const { costAmount, costPurpose } = getSelectedSpotCostPopupValues(popup);

  if (saveIfAny && (costAmount || costPurpose)) {
    saveSelectedSpotCostPopup(spot, popup);
  } else {
    resetSelectedSpotCostPopup(spot);
  }

  popup.hidden = true;
  spot.classList.remove("is-cost-open");
};

const getSelectedSpotLinkPopupValues = (popup) => {
  const linkInput = popup.querySelector("[data-selected-spot-link-input]");

  return {
    link: linkInput instanceof HTMLInputElement ? linkInput.value.trim() : "",
  };
};

const resetSelectedSpotLinkPopup = (spot) => {
  const linkInput = spot.querySelector("[data-selected-spot-link-input]");

  if (linkInput instanceof HTMLInputElement) {
    linkInput.value = spot.dataset.selectedSpotLink || "";
  }
};

const saveSelectedSpotLinkPopup = (spot, popup) => {
  const { link } = getSelectedSpotLinkPopupValues(popup);

  spot.dataset.selectedSpotLink = link;
  updateSelectedSpotLinkButton(spot);
  dispatchSelectedSpotsChange();
};

const closeSelectedSpotLinkPopup = (popup, { saveIfAny = false } = {}) => {
  const spot = popup.closest(".p-plan__selectedSpot");

  if (!(popup instanceof HTMLElement) || !(spot instanceof HTMLElement)) {
    return;
  }

  const { link } = getSelectedSpotLinkPopupValues(popup);

  if (saveIfAny && link) {
    saveSelectedSpotLinkPopup(spot, popup);
  } else {
    resetSelectedSpotLinkPopup(spot);
  }

  popup.hidden = true;
  spot.classList.remove("is-link-open");
};

const getSelectedSpotTimePopupValues = (popup) => {
  const startSelect = popup.querySelector(
    '[data-selected-spot-time-field="startTime"]',
  );
  const endSelect = popup.querySelector(
    '[data-selected-spot-time-field="endTime"]',
  );

  return {
    startTime:
      startSelect instanceof HTMLSelectElement ? startSelect.value : "",
    endTime: endSelect instanceof HTMLSelectElement ? endSelect.value : "",
  };
};

const resetSelectedSpotTimePopup = (spot) => {
  const startSelect = spot.querySelector(
    '[data-selected-spot-time-field="startTime"]',
  );
  const endSelect = spot.querySelector(
    '[data-selected-spot-time-field="endTime"]',
  );

  if (startSelect instanceof HTMLSelectElement) {
    startSelect.value = spot.dataset.selectedSpotStartTime || "";
  }

  if (endSelect instanceof HTMLSelectElement) {
    endSelect.value = spot.dataset.selectedSpotEndTime || "";
  }
};

const saveSelectedSpotTimePopup = (spot, popup) => {
  const { startTime, endTime } = getSelectedSpotTimePopupValues(popup);

  spot.dataset.selectedSpotStartTime = startTime;
  spot.dataset.selectedSpotEndTime = endTime;
  updateSelectedSpotTimeButton(spot);
  dispatchSelectedSpotsChange();
};

const closeSelectedSpotTimePopup = (popup, { saveIfAny = false } = {}) => {
  const spot = popup.closest(".p-plan__selectedSpot");

  if (!(popup instanceof HTMLElement) || !(spot instanceof HTMLElement)) {
    return;
  }

  const { startTime, endTime } = getSelectedSpotTimePopupValues(popup);

  if (saveIfAny && (startTime || endTime)) {
    saveSelectedSpotTimePopup(spot, popup);
  } else {
    resetSelectedSpotTimePopup(spot);
  }

  popup.hidden = true;
  spot.classList.remove("is-time-open");
};

const getSelectedSpotList = (input) => {
  const dateRelative = input.closest(".p-plan__dateRelative");

  if (!(dateRelative instanceof HTMLElement)) {
    return null;
  }

  const previousElement = dateRelative.previousElementSibling;

  if (
    previousElement instanceof HTMLUListElement &&
    previousElement.classList.contains("p-plan__selectedSpotList")
  ) {
    previousElement.dataset.planDayKey = input.dataset.planDayKey || "day";
    return previousElement;
  }

  const spotList = document.createElement("ul");
  spotList.className = "p-plan__selectedSpotList";
  spotList.dataset.planDayKey = input.dataset.planDayKey || "day";
  dateRelative.before(spotList);

  return spotList;
};

const insertSelectedSpot = (input, place) => {
  const spotList = getSelectedSpotList(input);
  const selectedSpotKey = createSelectedSpotKey(input, place.id);

  if (!spotList) {
    return null;
  }

  const existingSpot = [...spotList.children].find((child) => {
    return (
      child instanceof HTMLElement &&
      child.dataset.selectedSpotKey === selectedSpotKey
    );
  });

  if (existingSpot instanceof HTMLElement) {
    existingSpot.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    return spotList;
  }

  const item = document.createElement("li");
  const number = document.createElement("span");
  const content = document.createElement("span");
  const name = document.createElement("span");
  const actionRow = document.createElement("span");
  const timeButton = document.createElement("button");
  const costButton = document.createElement("button");
  const linkButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const deleteIconImage = document.createElement("img");
  const spotImage = getSelectedSpotImage(place);

  item.className = "p-plan__selectedSpot";
  item.dataset.selectedSpotKey = selectedSpotKey;
  item.dataset.selectedPlaceId = place.id;
  item.dataset.selectedPlaceName = place.name;
  item.dataset.selectedPlaceMeta = place.meta || "";
  item.dataset.selectedPlaceAddress = place.address || "";
  item.dataset.selectedSpotStartTime = place.startTime || "";
  item.dataset.selectedSpotEndTime = place.endTime || "";
  item.dataset.selectedSpotCostAmount = place.costAmount || "";
  item.dataset.selectedSpotCostCurrency =
    place.costCurrency || DEFAULT_COST_CURRENCY;
  item.dataset.selectedSpotCostPurpose = place.costPurpose || "";
  item.dataset.selectedSpotLink = place.link || "";
  item.draggable = true;
  number.className = "p-plan__selectedSpotNumber";
  content.className = "p-plan__selectedSpotContent";

  name.className = "p-plan__selectedSpotName";
  name.textContent = place.name;
  content.appendChild(name);

  if (place.meta) {
    const meta = document.createElement("span");
    meta.className = "p-plan__selectedSpotMeta";
    meta.textContent = place.meta;
    content.appendChild(meta);
  }

  actionRow.className = "p-plan__selectedSpotActionRow";

  timeButton.type = "button";
  timeButton.className = "p-plan__selectedSpotTimeButton";
  timeButton.dataset.selectedSpotTime = selectedSpotKey;
  const timeButtonIcon = document.createElement("img");
  const timeButtonText = document.createElement("span");
  const costButtonIcon = document.createElement("img");
  const costButtonText = document.createElement("span");
  const linkButtonIcon = document.createElement("img");
  const linkButtonText = document.createElement("span");

  timeButtonIcon.className = "p-plan__selectedSpotTimeButtonIcon";
  timeButtonIcon.src = "/src/assets/common/clock-icon-gray.svg";
  timeButtonIcon.alt = "";
  timeButtonIcon.draggable = false;
  timeButtonText.className = "p-plan__selectedSpotTimeButtonText";
  timeButtonText.textContent = "予定時刻を追加";
  timeButton.append(timeButtonIcon, timeButtonText);

  costButton.type = "button";
  costButton.className = "p-plan__selectedSpotCostButton";
  costButton.dataset.selectedSpotCost = selectedSpotKey;
  costButtonIcon.className = "p-plan__selectedSpotCostButtonIcon";
  costButtonIcon.src = "/src/assets/common/pay-icon-gray.svg";
  costButtonIcon.alt = "";
  costButtonIcon.draggable = false;
  costButtonText.className = "p-plan__selectedSpotCostButtonText";
  costButtonText.textContent = "費用を追加";
  costButton.append(costButtonIcon, costButtonText);

  linkButton.type = "button";
  linkButton.className = "p-plan__selectedLinkButton";
  linkButton.dataset.selectedSpotLink = selectedSpotKey;
  linkButtonIcon.className = "p-plan__selectedLinkButtonIcon";
  linkButtonIcon.src = "/src/assets/common/link-icon-gray.svg";
  linkButtonIcon.alt = "";
  linkButtonIcon.draggable = false;
  linkButtonText.className = "p-plan__selectedLinkButtonText";
  linkButtonText.textContent = "関連リンクを追加";
  linkButton.append(linkButtonIcon, linkButtonText);

  actionRow.append(timeButton, costButton, linkButton);
  content.appendChild(actionRow);

  const linkPopup = document.createElement("div");
  const linkField = document.createElement("label");
  const linkLabel = document.createElement("span");
  const linkInput = document.createElement("input");
  const linkOpenAnchor = document.createElement("a");
  const linkActions = document.createElement("div");
  const linkCancelButton = document.createElement("button");
  const linkSaveButton = document.createElement("button");

  linkPopup.className = "p-plan__selectedLinkPopup";
  linkPopup.dataset.selectedSpotLinkPopup = selectedSpotKey;
  linkPopup.hidden = true;

  linkField.className = "p-plan__selectedLinkField";
  linkLabel.className = "p-plan__selectedLinkLabel";
  linkLabel.textContent = "関連リンク";
  linkInput.className = "p-plan__selectedLinkInput";
  linkInput.type = "url";
  linkInput.inputMode = "url";
  linkInput.placeholder = "https://example.com";
  linkInput.value = place.link || "";
  linkInput.dataset.selectedSpotLinkInput = "";
  linkField.append(linkLabel, linkInput);

  linkOpenAnchor.className = "p-plan__selectedLinkOpen";
  linkOpenAnchor.textContent = "リンクを開く";
  linkOpenAnchor.target = "_blank";
  linkOpenAnchor.rel = "noopener noreferrer";
  linkOpenAnchor.dataset.selectedSpotLinkOpen = "";
  linkOpenAnchor.hidden = !getSelectedSpotLinkHref(place.link || "");
  if (!linkOpenAnchor.hidden) {
    linkOpenAnchor.href = getSelectedSpotLinkHref(place.link || "");
  }

  linkActions.className = "p-plan__selectedLinkActions";
  linkCancelButton.type = "button";
  linkCancelButton.className =
    "p-plan__selectedLinkAction p-plan__selectedLinkAction--cancel";
  linkCancelButton.textContent = "キャンセル";
  linkCancelButton.dataset.selectedSpotLinkCancel = selectedSpotKey;
  linkSaveButton.type = "button";
  linkSaveButton.className =
    "p-plan__selectedLinkAction p-plan__selectedLinkAction--save";
  linkSaveButton.textContent = "保存";
  linkSaveButton.dataset.selectedSpotLinkSave = selectedSpotKey;
  linkActions.append(linkCancelButton, linkSaveButton);

  linkPopup.append(linkField, linkOpenAnchor, linkActions);
  content.appendChild(linkPopup);

  const costPopup = document.createElement("div");
  const costAmountField = document.createElement("label");
  const costAmountLabel = document.createElement("span");
  const costAmountControl = document.createElement("span");
  const costAmountInput = document.createElement("input");
  const costCurrencySelect = document.createElement("select");
  const costPurposeField = document.createElement("label");
  const costPurposeLabel = document.createElement("span");
  const costPurposeSelect = document.createElement("select");
  const costPurposeEmptyOption = document.createElement("option");
  const costActions = document.createElement("div");
  const costCancelButton = document.createElement("button");
  const costSaveButton = document.createElement("button");

  costPopup.className = "p-plan__selectedSpotCostPopup";
  costPopup.dataset.selectedSpotCostPopup = selectedSpotKey;
  costPopup.hidden = true;

  costAmountField.className = "p-plan__selectedSpotCostField";
  costAmountLabel.className = "p-plan__selectedSpotCostLabel";
  costAmountLabel.textContent = "金額";
  costAmountControl.className = "p-plan__selectedSpotCostAmountControl";
  costAmountInput.className = "p-plan__selectedSpotCostInput";
  costAmountInput.type = "number";
  costAmountInput.min = "0";
  costAmountInput.step = "1";
  costAmountInput.inputMode = "numeric";
  costAmountInput.placeholder = "0";
  costAmountInput.value = place.costAmount || "";
  costAmountInput.dataset.selectedSpotCostAmount = "";
  costCurrencySelect.className = "p-plan__selectedSpotCostCurrency";
  costCurrencySelect.dataset.selectedSpotCostCurrency = "";
  getAvailableCostCurrencies().forEach((currency) => {
    const option = document.createElement("option");

    option.value = currency.code;
    option.textContent = currency.label;
    costCurrencySelect.appendChild(option);
  });
  costCurrencySelect.value = getAvailableCostCurrencies().some((currency) => {
    return currency.code === place.costCurrency;
  })
    ? place.costCurrency
    : DEFAULT_COST_CURRENCY;
  costAmountControl.append(costAmountInput, costCurrencySelect);
  costAmountField.append(costAmountLabel, costAmountControl);

  costPurposeField.className = "p-plan__selectedSpotCostField";
  costPurposeLabel.className = "p-plan__selectedSpotCostLabel";
  costPurposeLabel.textContent = "用途";
  costPurposeSelect.className = "p-plan__selectedSpotCostPurpose";
  costPurposeSelect.dataset.selectedSpotCostPurpose = "";
  costPurposeEmptyOption.value = "";
  costPurposeEmptyOption.textContent = "選択してください";
  costPurposeSelect.appendChild(costPurposeEmptyOption);
  COST_PURPOSES.forEach((purpose) => {
    const option = document.createElement("option");

    option.value = purpose.value;
    option.textContent = purpose.label;
    costPurposeSelect.appendChild(option);
  });
  costPurposeSelect.value = place.costPurpose || "";
  costPurposeField.append(costPurposeLabel, costPurposeSelect);

  costActions.className = "p-plan__selectedSpotCostActions";
  costCancelButton.type = "button";
  costCancelButton.className =
    "p-plan__selectedSpotCostAction p-plan__selectedSpotCostAction--cancel";
  costCancelButton.textContent = "キャンセル";
  costCancelButton.dataset.selectedSpotCostCancel = selectedSpotKey;
  costSaveButton.type = "button";
  costSaveButton.className =
    "p-plan__selectedSpotCostAction p-plan__selectedSpotCostAction--save";
  costSaveButton.textContent = "保存";
  costSaveButton.dataset.selectedSpotCostSave = selectedSpotKey;
  costActions.append(costCancelButton, costSaveButton);

  costPopup.append(costAmountField, costPurposeField, costActions);
  content.appendChild(costPopup);

  const timePopup = document.createElement("div");
  const startLabel = document.createElement("label");
  const startLabelText = document.createElement("span");
  const startInput = createSelectedSpotTimeSelect(
    place.startTime || "",
    "startTime",
  );
  const endLabel = document.createElement("label");
  const endLabelText = document.createElement("span");
  const endInput = createSelectedSpotTimeSelect(place.endTime || "", "endTime");
  const timeActions = document.createElement("div");
  const timeCancelButton = document.createElement("button");
  const timeSaveButton = document.createElement("button");

  timePopup.className = "p-plan__selectedSpotTimePopup";
  timePopup.dataset.selectedSpotTimePopup = selectedSpotKey;
  timePopup.hidden = true;

  startLabel.className = "p-plan__selectedSpotTimeField";
  startLabelText.className = "p-plan__selectedSpotTimeLabel";
  startLabelText.textContent = "開始時刻";
  startLabel.append(startLabelText, startInput);

  endLabel.className = "p-plan__selectedSpotTimeField";
  endLabelText.className = "p-plan__selectedSpotTimeLabel";
  endLabelText.textContent = "終了時刻";
  endLabel.append(endLabelText, endInput);

  timeActions.className = "p-plan__selectedSpotTimeActions";
  timeCancelButton.type = "button";
  timeCancelButton.className =
    "p-plan__selectedSpotTimeAction p-plan__selectedSpotTimeAction--cancel";
  timeCancelButton.textContent = "キャンセル";
  timeCancelButton.dataset.selectedSpotTimeCancel = selectedSpotKey;
  timeSaveButton.type = "button";
  timeSaveButton.className =
    "p-plan__selectedSpotTimeAction p-plan__selectedSpotTimeAction--save";
  timeSaveButton.textContent = "保存";
  timeSaveButton.dataset.selectedSpotTimeSave = selectedSpotKey;
  timeActions.append(timeCancelButton, timeSaveButton);

  timePopup.append(startLabel, endLabel, timeActions);
  content.appendChild(timePopup);

  deleteButton.type = "button";
  deleteButton.className = "p-plan__selectedSpotDelete";
  deleteButton.dataset.selectedSpotDelete = selectedSpotKey;
  deleteButton.setAttribute("aria-label", `${place.name}を削除`);
  deleteIconImage.src = "/src/assets/common/delete-icon-green.svg";
  deleteIconImage.alt = "";
  deleteIconImage.draggable = false;
  deleteButton.appendChild(deleteIconImage);

  item.append(number, content);

  if (spotImage) {
    const image = document.createElement("img");

    item.classList.add("has-image");
    image.className = "p-plan__selectedSpotImage";
    image.src = spotImage.src;
    image.alt =
      typeof spotImage.alt === "string" && spotImage.alt.trim()
        ? spotImage.alt
        : `${place.name}の画像`;
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    item.appendChild(image);
  }

  item.appendChild(deleteButton);
  spotList.appendChild(item);
  updateSelectedSpotTimeButton(item);
  updateSelectedSpotCostButton(item);
  updateSelectedSpotLinkButton(item);
  updateSelectedSpotNumbers(spotList);

  return spotList;
};

const setupPlanSpotSuggestion = () => {
  let debounceTimer = 0;
  let abortController = null;
  let activeInput = null;
  let activeList = null;
  let currentPlaces = [];
  let draggedSpot = null;
  let dragStartSelectedSpots = "";

  const getSuggestionList = (input) => {
    const dateRelative = input.closest(".p-plan__dateRelative");
    const list = dateRelative?.querySelector("[data-plan-spot-suggestions]");

    return list instanceof HTMLElement ? list : null;
  };

  const hideActiveSuggestions = () => {
    if (
      activeInput instanceof HTMLInputElement &&
      activeList instanceof HTMLElement
    ) {
      hideSuggestions(activeList, activeInput);
    }

    currentPlaces = [];
  };

  const selectPlace = (input, place) => {
    const selectedSpot = insertSelectedSpot(input, place);
    const suggestions = getSuggestionList(input);

    input.value = "";
    currentPlaces = [];
    if (selectedSpot instanceof HTMLUListElement) {
      updateSelectedSpotNumbers(selectedSpot);
    }
    if (suggestions instanceof HTMLElement) {
      hideSuggestions(suggestions, input);
    }
    dispatchSelectedSpotsChange();
    input.focus();
  };

  const updateSuggestions = (input) => {
    const suggestions = getSuggestionList(input);

    if (!(suggestions instanceof HTMLElement)) {
      return;
    }

    activeInput = input;
    activeList = suggestions;
    const query = input.value.trim();

    window.clearTimeout(debounceTimer);

    if (abortController) {
      abortController.abort();
    }

    if (!query) {
      currentPlaces = [];
      hideSuggestions(suggestions, input);
      return;
    }

    const cachedPlaces = getCachedPlaces(createSearchCacheKey(query));

    if (cachedPlaces) {
      currentPlaces = cachedPlaces;
      renderSuggestions(suggestions, input, currentPlaces);
      return;
    }

    abortController = new AbortController();
    debounceTimer = window.setTimeout(async () => {
      try {
        currentPlaces = await searchPlaces(query, abortController.signal);
        if (activeInput !== input || activeList !== suggestions) {
          return;
        }

        renderSuggestions(suggestions, input, currentPlaces);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        currentPlaces = [];
        hideSuggestions(suggestions, input);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  document.addEventListener("focusin", (event) => {
    const input =
      event.target instanceof Element
        ? event.target.closest("[data-plan-spot-input]")
        : null;

    if (
      !(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)
    ) {
      return;
    }

    hideActiveSuggestions();
    updateSuggestions(input);
  });

  document.addEventListener("input", (event) => {
    const input =
      event.target instanceof Element
        ? event.target.closest("[data-plan-spot-input]")
        : null;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    updateSuggestions(input);
  });

  document.addEventListener("keydown", (event) => {
    const input =
      event.target instanceof Element
        ? event.target.closest("[data-plan-spot-input]")
        : null;

    if (
      input instanceof HTMLInputElement &&
      event.key === "Enter" &&
      currentPlaces.length > 0 &&
      activeList instanceof HTMLElement &&
      !activeList.hidden
    ) {
      event.preventDefault();
      return;
    }

    const suggestionList =
      event.target instanceof Element
        ? event.target.closest("[data-plan-spot-suggestions]")
        : null;

    if (suggestionList instanceof HTMLElement && event.key === "Enter") {
      event.preventDefault();
    }
  });

  document.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-place-id]")
        : null;

    if (
      !(button instanceof HTMLButtonElement) ||
      !(activeInput instanceof HTMLInputElement)
    ) {
      return;
    }

    const place = currentPlaces.find((item) => {
      return item.id === button.dataset.placeId;
    });

    if (place) {
      selectPlace(activeInput, place);
    }
  });

  document.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-time]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const spot = button.closest(".p-plan__selectedSpot");
    const popup =
      spot instanceof HTMLElement
        ? spot.querySelector("[data-selected-spot-time-popup]")
        : null;

    if (!(spot instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
      return;
    }

    const willOpen = popup.hidden;

    document
      .querySelectorAll("[data-selected-spot-time-popup]")
      .forEach((timePopup) => {
        if (timePopup instanceof HTMLElement) {
          closeSelectedSpotTimePopup(timePopup, {
            saveIfAny: timePopup !== popup,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-cost-popup]")
      .forEach((costPopup) => {
        if (costPopup instanceof HTMLElement) {
          closeSelectedSpotCostPopup(costPopup, {
            saveIfAny: true,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-link-popup]")
      .forEach((linkPopup) => {
        if (linkPopup instanceof HTMLElement) {
          closeSelectedSpotLinkPopup(linkPopup, {
            saveIfAny: true,
          });
        }
      });

    if (willOpen) {
      resetSelectedSpotTimePopup(spot);
    }

    popup.hidden = !willOpen;
    spot.classList.toggle("is-time-open", willOpen);

    if (willOpen) {
      popup.querySelector("select")?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const saveButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-time-save]")
        : null;

    if (!(saveButton instanceof HTMLButtonElement)) {
      return;
    }

    const spot = saveButton.closest(".p-plan__selectedSpot");
    const popup =
      spot instanceof HTMLElement
        ? spot.querySelector("[data-selected-spot-time-popup]")
        : null;

    if (!(spot instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
      return;
    }

    saveSelectedSpotTimePopup(spot, popup);
    closeSelectedSpotTimePopup(popup);
  });

  document.addEventListener("click", (event) => {
    const cancelButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-time-cancel]")
        : null;

    if (!(cancelButton instanceof HTMLButtonElement)) {
      return;
    }

    const popup = cancelButton.closest("[data-selected-spot-time-popup]");

    if (popup instanceof HTMLElement) {
      closeSelectedSpotTimePopup(popup);
    }
  });

  document.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-cost]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const spot = button.closest(".p-plan__selectedSpot");
    const popup =
      spot instanceof HTMLElement
        ? spot.querySelector("[data-selected-spot-cost-popup]")
        : null;

    if (!(spot instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
      return;
    }

    const willOpen = popup.hidden;

    document
      .querySelectorAll("[data-selected-spot-cost-popup]")
      .forEach((costPopup) => {
        if (costPopup instanceof HTMLElement) {
          closeSelectedSpotCostPopup(costPopup, {
            saveIfAny: costPopup !== popup,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-time-popup]")
      .forEach((timePopup) => {
        if (timePopup instanceof HTMLElement) {
          closeSelectedSpotTimePopup(timePopup, {
            saveIfAny: true,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-link-popup]")
      .forEach((linkPopup) => {
        if (linkPopup instanceof HTMLElement) {
          closeSelectedSpotLinkPopup(linkPopup, {
            saveIfAny: true,
          });
        }
      });

    if (willOpen) {
      resetSelectedSpotCostPopup(spot);
    }

    popup.hidden = !willOpen;
    spot.classList.toggle("is-cost-open", willOpen);

    if (willOpen) {
      popup.querySelector("input")?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const saveButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-cost-save]")
        : null;

    if (!(saveButton instanceof HTMLButtonElement)) {
      return;
    }

    const spot = saveButton.closest(".p-plan__selectedSpot");
    const popup =
      spot instanceof HTMLElement
        ? spot.querySelector("[data-selected-spot-cost-popup]")
        : null;

    if (!(spot instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
      return;
    }

    saveSelectedSpotCostPopup(spot, popup);
    closeSelectedSpotCostPopup(popup);
  });

  document.addEventListener("click", (event) => {
    const cancelButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-cost-cancel]")
        : null;

    if (!(cancelButton instanceof HTMLButtonElement)) {
      return;
    }

    const popup = cancelButton.closest("[data-selected-spot-cost-popup]");

    if (popup instanceof HTMLElement) {
      closeSelectedSpotCostPopup(popup);
    }
  });

  document.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-link]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const spot = button.closest(".p-plan__selectedSpot");
    const popup =
      spot instanceof HTMLElement
        ? spot.querySelector("[data-selected-spot-link-popup]")
        : null;

    if (!(spot instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
      return;
    }

    const willOpen = popup.hidden;

    document
      .querySelectorAll("[data-selected-spot-link-popup]")
      .forEach((linkPopup) => {
        if (linkPopup instanceof HTMLElement) {
          closeSelectedSpotLinkPopup(linkPopup, {
            saveIfAny: linkPopup !== popup,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-time-popup]")
      .forEach((timePopup) => {
        if (timePopup instanceof HTMLElement) {
          closeSelectedSpotTimePopup(timePopup, {
            saveIfAny: true,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-cost-popup]")
      .forEach((costPopup) => {
        if (costPopup instanceof HTMLElement) {
          closeSelectedSpotCostPopup(costPopup, {
            saveIfAny: true,
          });
        }
      });

    if (willOpen) {
      resetSelectedSpotLinkPopup(spot);
    }

    popup.hidden = !willOpen;
    spot.classList.toggle("is-link-open", willOpen);

    if (willOpen) {
      popup.querySelector("input")?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const saveButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-link-save]")
        : null;

    if (!(saveButton instanceof HTMLButtonElement)) {
      return;
    }

    const spot = saveButton.closest(".p-plan__selectedSpot");
    const popup =
      spot instanceof HTMLElement
        ? spot.querySelector("[data-selected-spot-link-popup]")
        : null;

    if (!(spot instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
      return;
    }

    saveSelectedSpotLinkPopup(spot, popup);
    closeSelectedSpotLinkPopup(popup);
  });

  document.addEventListener("click", (event) => {
    const cancelButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-link-cancel]")
        : null;

    if (!(cancelButton instanceof HTMLButtonElement)) {
      return;
    }

    const popup = cancelButton.closest("[data-selected-spot-link-popup]");

    if (popup instanceof HTMLElement) {
      closeSelectedSpotLinkPopup(popup);
    }
  });

  document.addEventListener("click", (event) => {
    const deleteButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-delete]")
        : null;

    if (!(deleteButton instanceof HTMLButtonElement)) {
      return;
    }

    const spot = deleteButton.closest(".p-plan__selectedSpot");
    const spotList = spot?.parentElement;

    if (spot instanceof HTMLElement) {
      spot.remove();
    }

    if (
      spotList instanceof HTMLUListElement &&
      spotList.classList.contains("p-plan__selectedSpotList") &&
      spotList.children.length === 0
    ) {
      spotList.remove();
      dispatchSelectedSpotsChange();
      return;
    }

    if (
      spotList instanceof HTMLUListElement &&
      spotList.classList.contains("p-plan__selectedSpotList")
    ) {
      updateSelectedSpotNumbers(spotList);
    }

    dispatchSelectedSpotsChange();
  });

  document.addEventListener("dragstart", (event) => {
    const spot =
      event.target instanceof Element
        ? event.target.closest(".p-plan__selectedSpot")
        : null;

    if (!(spot instanceof HTMLElement)) {
      return;
    }

    draggedSpot = spot;
    dragStartSelectedSpots = JSON.stringify(collectSelectedSpots());
    spot.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "text/plain",
        spot.dataset.selectedPlaceId || "",
      );
    }
  });

  document.addEventListener("dragover", (event) => {
    const spotList =
      event.target instanceof Element
        ? event.target.closest(".p-plan__selectedSpotList")
        : null;

    if (
      !(spotList instanceof HTMLUListElement) ||
      !(draggedSpot instanceof HTMLElement) ||
      draggedSpot.parentElement !== spotList
    ) {
      return;
    }

    event.preventDefault();
    const afterSpot = getDragAfterSpot(spotList, event.clientY);

    if (afterSpot instanceof HTMLElement) {
      spotList.insertBefore(draggedSpot, afterSpot);
      updateSelectedSpotNumbers(spotList);
      return;
    }

    spotList.appendChild(draggedSpot);
    updateSelectedSpotNumbers(spotList);
  });

  document.addEventListener("drop", (event) => {
    if (draggedSpot instanceof HTMLElement) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragend", () => {
    if (draggedSpot instanceof HTMLElement) {
      draggedSpot.classList.remove("is-dragging");
    }

    if (
      dragStartSelectedSpots &&
      dragStartSelectedSpots !== JSON.stringify(collectSelectedSpots())
    ) {
      dispatchSelectedSpotsChange();
    }

    draggedSpot = null;
    dragStartSelectedSpots = "";
  });

  document.addEventListener("click", (event) => {
    if (
      !(event.target instanceof Node) ||
      !(activeInput instanceof HTMLInputElement) ||
      !(activeList instanceof HTMLElement)
    ) {
      return;
    }

    if (
      !activeInput.contains(event.target) &&
      !activeList.contains(event.target)
    ) {
      hideActiveSuggestions();
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    document
      .querySelectorAll("[data-selected-spot-time-popup]")
      .forEach((timePopup) => {
        const spot = timePopup.closest(".p-plan__selectedSpot");

        if (
          timePopup instanceof HTMLElement &&
          spot instanceof HTMLElement &&
          !spot.contains(event.target)
        ) {
          closeSelectedSpotTimePopup(timePopup, {
            saveIfAny: true,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-cost-popup]")
      .forEach((costPopup) => {
        const spot = costPopup.closest(".p-plan__selectedSpot");

        if (
          costPopup instanceof HTMLElement &&
          spot instanceof HTMLElement &&
          !spot.contains(event.target)
        ) {
          closeSelectedSpotCostPopup(costPopup, {
            saveIfAny: true,
          });
        }
      });
    document
      .querySelectorAll("[data-selected-spot-link-popup]")
      .forEach((linkPopup) => {
        const spot = linkPopup.closest(".p-plan__selectedSpot");

        if (
          linkPopup instanceof HTMLElement &&
          spot instanceof HTMLElement &&
          !spot.contains(event.target)
        ) {
          closeSelectedSpotLinkPopup(linkPopup, {
            saveIfAny: true,
          });
        }
      });
  });

  document.addEventListener("tripCompassPlanDatesRendered", () => {
    window.clearTimeout(debounceTimer);
    abortController?.abort();
    abortController = null;
    hideActiveSuggestions();
    activeInput = null;
    activeList = null;
  });

  document.addEventListener("tripCompassPlanSelectedSpotsRender", (event) => {
    const selectedSpots =
      event instanceof CustomEvent && Array.isArray(event.detail?.selectedSpots)
        ? event.detail.selectedSpots
        : [];

    renderStoredSelectedSpots(selectedSpots);
  });

  document.dispatchEvent(
    new CustomEvent("tripCompassPlanSelectedSpotsRequest"),
  );
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupPlanSpotSuggestion, {
    once: true,
  });
} else {
  setupPlanSpotSuggestion();
}
