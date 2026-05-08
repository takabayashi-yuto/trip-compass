import flatpickr from "flatpickr";
import { Japanese } from "flatpickr/dist/l10n/ja.js";

const CREATE_PLAN_DATE_STORAGE_KEY = "tripCompassCreatePlanDate";

// 作成画面で選んだ日程を sessionStorage から取得する。
const getStoredCreatePlanDate = () => {
  try {
    return sessionStorage.getItem(CREATE_PLAN_DATE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

// 作成画面で選んだ日程を sessionStorage に保存する。
const setStoredCreatePlanDate = (date) => {
  try {
    sessionStorage.setItem(CREATE_PLAN_DATE_STORAGE_KEY, date);
  } catch {
    return;
  }
};

// 新規作成開始時に前回の日程入力をクリアする。
const clearStoredCreatePlanDate = () => {
  try {
    sessionStorage.removeItem(CREATE_PLAN_DATE_STORAGE_KEY);
  } catch {
    return;
  }
};

// flatpickr の初期選択値として保存済み日程を配列へ変換する。
const getDefaultCreatePlanDate = () => {
  const storedDate = getStoredCreatePlanDate();

  if (!storedDate) {
    return undefined;
  }

  return storedDate.split(" 〜 ").filter(Boolean);
};

// 日程変更を他モジュールへ通知する。
const dispatchPlanDateChange = (dateText) => {
  document.dispatchEvent(
    new CustomEvent("tripCompassPlanDateChange", {
      detail: { dateText },
    }),
  );
};

// 日付入力に flatpickr を設定し、選択結果を画面と保存領域へ同期する。
const setupCreateDatePicker = () => {
  const input = document.querySelector("#date");
  const planDateButton = document.querySelector("[data-plan-date-edit]");
  const planDateText = document.querySelector(".p-plan__kvDateText");

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.classList.contains("p-create__input")) {
    clearStoredCreatePlanDate();
    input.value = "";
  }

  const updatePlanDateText = (dateStr = getStoredCreatePlanDate()) => {
    if (planDateText instanceof HTMLElement) {
      planDateText.textContent = dateStr;
    }
  };

  const picker = flatpickr(input, {
    locale: {
      ...Japanese,
      rangeSeparator: " 〜 ",
    },
    mode: "range",
    dateFormat: "Y/m/d",
    minDate: "today",
    disableMobile: true,
    defaultDate: getDefaultCreatePlanDate(),
    positionElement:
      planDateButton instanceof HTMLElement ? planDateButton : undefined,
    onChange: (_selectedDates, dateStr) => {
      setStoredCreatePlanDate(dateStr);
      updatePlanDateText(dateStr);
      dispatchPlanDateChange(dateStr);
    },
  });

  input.addEventListener("change", () => {
    setStoredCreatePlanDate(input.value);
    updatePlanDateText(input.value);
    dispatchPlanDateChange(input.value);
  });

  if (planDateButton instanceof HTMLButtonElement) {
    planDateButton.addEventListener("click", () => {
      picker.open();
    });
  }

  updatePlanDateText();
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupCreateDatePicker();
    },
    {
      once: true,
    },
  );
} else {
  setupCreateDatePicker();
}
