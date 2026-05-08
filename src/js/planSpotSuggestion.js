const PLAN_DRAFT_STORAGE_KEY = "tripCompassPlanDraft";
const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const CREATE_PLAN_DESTINATIONS_STORAGE_KEY =
  "tripCompassCreatePlanDestinations";
const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MAP_EMBED_ENDPOINT = "https://www.openstreetmap.org/export/embed.html";
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 5;

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
  const plan = getPlanFromUrl();
  const destinations = Array.isArray(plan?.destinations)
    ? plan.destinations
    : getStoredJson(sessionStorage, CREATE_PLAN_DESTINATIONS_STORAGE_KEY, []);

  return Array.isArray(destinations)
    ? destinations.filter(isStoredDestination).map((destination) => {
        return destination.name;
      })
    : [];
};

const createSearchQuery = (query) => {
  const destinationNames = getActiveDestinationNames();

  if (destinationNames.length === 0) {
    return query;
  }

  return `${query} ${destinationNames.join(" ")}`;
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
  return String(place.display_name || "")
    .split(",")
    .slice(1, 4)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" / ");
};

const normalizePlace = (place) => {
  const lat = Number(place.lat);
  const lon = Number(place.lon);
  const name = getPlaceName(place);

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    id: String(place.place_id || `${lat}-${lon}`),
    name,
    meta: getPlaceMeta(place),
    lat,
    lon,
  };
};

const searchPlaces = async (query, signal) => {
  const params = new URLSearchParams({
    q: createSearchQuery(query),
    format: "jsonv2",
    limit: String(MAX_SUGGESTIONS),
    addressdetails: "1",
    "accept-language": "ja",
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

const createMapEmbedUrl = (place) => {
  const latitudePadding = 0.01;
  const longitudePadding = 0.012;
  const params = new URLSearchParams({
    bbox: [
      place.lon - longitudePadding,
      place.lat - latitudePadding,
      place.lon + longitudePadding,
      place.lat + latitudePadding,
    ].join(","),
    layer: "mapnik",
    marker: `${place.lat},${place.lon}`,
  });

  return `${MAP_EMBED_ENDPOINT}?${params}`;
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
    return previousElement;
  }

  const spotList = document.createElement("ul");
  spotList.className = "p-plan__selectedSpotList";
  dateRelative.before(spotList);

  return spotList;
};

const insertSelectedSpot = (input, place) => {
  const spotList = getSelectedSpotList(input);

  if (!spotList) {
    return;
  }

  const existingSpot = [...spotList.children].find((child) => {
    return (
      child instanceof HTMLElement && child.dataset.selectedPlaceId === place.id
    );
  });

  if (existingSpot instanceof HTMLElement) {
    existingSpot.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    return;
  }

  const item = document.createElement("li");
  const name = document.createElement("span");

  item.className = "p-plan__selectedSpot";
  item.dataset.selectedPlaceId = place.id;

  name.className = "p-plan__selectedSpotName";
  name.textContent = place.name;
  item.appendChild(name);

  if (place.meta) {
    const meta = document.createElement("span");
    meta.className = "p-plan__selectedSpotMeta";
    meta.textContent = place.meta;
    item.appendChild(meta);
  }

  spotList.appendChild(item);
};

const setupPlanSpotSuggestion = () => {
  const input = document.querySelector("[data-plan-spot-input]");
  const list = document.querySelector("[data-plan-spot-suggestions]");
  const map = document.querySelector("[data-plan-map]");

  if (
    !(input instanceof HTMLInputElement) ||
    !(list instanceof HTMLElement) ||
    !(map instanceof HTMLIFrameElement)
  ) {
    return;
  }

  let debounceTimer = 0;
  let abortController = null;
  let currentPlaces = [];

  const selectPlace = (place) => {
    insertSelectedSpot(input, place);
    input.value = "";
    currentPlaces = [];
    map.src = createMapEmbedUrl(place);
    hideSuggestions(list, input);
    input.focus();
  };

  const updateSuggestions = () => {
    const query = input.value.trim();

    window.clearTimeout(debounceTimer);

    if (abortController) {
      abortController.abort();
    }

    if (!query) {
      currentPlaces = [];
      hideSuggestions(list, input);
      return;
    }

    abortController = new AbortController();
    debounceTimer = window.setTimeout(async () => {
      try {
        currentPlaces = await searchPlaces(query, abortController.signal);
        renderSuggestions(list, input, currentPlaces);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        currentPlaces = [];
        hideSuggestions(list, input);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  input.addEventListener("input", updateSuggestions);
  input.addEventListener("focus", updateSuggestions);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || currentPlaces.length === 0 || list.hidden) {
      return;
    }

    event.preventDefault();
    selectPlace(currentPlaces[0]);
  });

  list.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-place-id]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const place = currentPlaces.find((item) => {
      return item.id === button.dataset.placeId;
    });

    if (place) {
      selectPlace(place);
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    if (!input.contains(event.target) && !list.contains(event.target)) {
      hideSuggestions(list, input);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupPlanSpotSuggestion, {
    once: true,
  });
} else {
  setupPlanSpotSuggestion();
}
