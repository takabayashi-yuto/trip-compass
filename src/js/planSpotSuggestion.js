import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const PLAN_DRAFT_STORAGE_KEY = "tripCompassPlanDraft";
const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const CREATE_PLAN_DESTINATIONS_STORAGE_KEY =
  "tripCompassCreatePlanDestinations";
const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 5;
const DEFAULT_MAP_CENTER = [135.7681, 35.0116];
const DEFAULT_MAP_ZOOM = 11;
const SELECTED_PLACE_ZOOM = 15;

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

const createMap = (container) => {
  return new maplibregl.Map({
    container,
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm",
        },
      ],
    },
  });
};

const createMapMarkerElement = (label) => {
  const marker = document.createElement("span");
  const markerText = document.createElement("span");

  marker.className = "p-plan__mapPin";
  markerText.className = "p-plan__mapPinText";
  markerText.textContent = label;
  marker.appendChild(markerText);

  return marker;
};

const updateMapMarkerNumbers = (spotList, markersByPlaceId) => {
  [...spotList.children].forEach((child, index) => {
    if (!(child instanceof HTMLElement) || !child.dataset.selectedPlaceId) {
      return;
    }

    const marker = markersByPlaceId.get(child.dataset.selectedPlaceId);
    const markerText = marker
      ?.getElement()
      .querySelector(".p-plan__mapPinText");

    if (markerText instanceof HTMLElement) {
      markerText.textContent = formatSelectedSpotNumber(index);
    }
  });
};

const addMapMarker = (map, markersByPlaceId, spotList, place) => {
  const spotIndex = [...spotList.children].findIndex((child) => {
    return (
      child instanceof HTMLElement && child.dataset.selectedPlaceId === place.id
    );
  });
  const label = formatSelectedSpotNumber(Math.max(spotIndex, 0));
  const existingMarker = markersByPlaceId.get(place.id);

  if (existingMarker) {
    existingMarker.setLngLat([place.lon, place.lat]);
    updateMapMarkerNumbers(spotList, markersByPlaceId);
    return;
  }

  const marker = new maplibregl.Marker({
    element: createMapMarkerElement(label),
    anchor: "bottom",
  })
    .setLngLat([place.lon, place.lat])
    .addTo(map);

  markersByPlaceId.set(place.id, marker);
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
    return null;
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
    return spotList;
  }

  const item = document.createElement("li");
  const number = document.createElement("span");
  const content = document.createElement("span");
  const name = document.createElement("span");
  const deleteButton = document.createElement("button");
  const deleteIconImage = document.createElement("img");

  item.className = "p-plan__selectedSpot";
  item.dataset.selectedPlaceId = place.id;
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

  deleteButton.type = "button";
  deleteButton.className = "p-plan__selectedSpotDelete";
  deleteButton.dataset.selectedSpotDelete = place.id;
  deleteButton.setAttribute("aria-label", `${place.name}を削除`);
  deleteIconImage.src = "/src/assets/common/delete-icon-green.svg";
  deleteIconImage.alt = "";
  deleteIconImage.draggable = false;
  deleteButton.appendChild(deleteIconImage);

  item.append(number, content, deleteButton);
  spotList.appendChild(item);
  updateSelectedSpotNumbers(spotList);

  return spotList;
};

const setupPlanSpotSuggestion = () => {
  const input = document.querySelector("[data-plan-spot-input]");
  const list = document.querySelector("[data-plan-spot-suggestions]");
  const mapContainer = document.querySelector("[data-plan-map]");

  if (
    !(input instanceof HTMLInputElement) ||
    !(list instanceof HTMLElement) ||
    !(mapContainer instanceof HTMLElement)
  ) {
    return;
  }

  const map = createMap(mapContainer);
  const markersByPlaceId = new Map();
  let debounceTimer = 0;
  let abortController = null;
  let currentPlaces = [];
  let draggedSpot = null;

  const selectPlace = (place) => {
    const spotList = insertSelectedSpot(input, place);
    input.value = "";
    currentPlaces = [];
    if (spotList) {
      addMapMarker(map, markersByPlaceId, spotList, place);
      map.flyTo({
        center: [place.lon, place.lat],
        zoom: Math.max(map.getZoom(), SELECTED_PLACE_ZOOM),
        essential: true,
      });
    }
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
    const deleteButton =
      event.target instanceof Element
        ? event.target.closest("[data-selected-spot-delete]")
        : null;

    if (!(deleteButton instanceof HTMLButtonElement)) {
      return;
    }

    const spot = deleteButton.closest(".p-plan__selectedSpot");
    const spotList = spot?.parentElement;
    const deletedPlaceId = deleteButton.dataset.selectedSpotDelete || null;

    if (spot instanceof HTMLElement) {
      spot.remove();
    }

    if (deletedPlaceId) {
      markersByPlaceId.get(deletedPlaceId)?.remove();
      markersByPlaceId.delete(deletedPlaceId);
    }

    if (
      spotList instanceof HTMLUListElement &&
      spotList.classList.contains("p-plan__selectedSpotList") &&
      spotList.children.length === 0
    ) {
      spotList.remove();
      return;
    }

    if (
      spotList instanceof HTMLUListElement &&
      spotList.classList.contains("p-plan__selectedSpotList")
    ) {
      updateSelectedSpotNumbers(spotList);
      updateMapMarkerNumbers(spotList, markersByPlaceId);
    }
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
      updateMapMarkerNumbers(spotList, markersByPlaceId);
      return;
    }

    spotList.appendChild(draggedSpot);
    updateSelectedSpotNumbers(spotList);
    updateMapMarkerNumbers(spotList, markersByPlaceId);
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

    draggedSpot = null;
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
