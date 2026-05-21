import flatpickr from "flatpickr";
import { Japanese } from "flatpickr/dist/l10n/ja.js";

const CREATE_PLAN_DATE_STORAGE_KEY = "tripCompassCreatePlanDate";
const CREATE_PLAN_PUBLIC_STORAGE_KEY = "tripCompassCreatePlanPublic";

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

// 作成画面で選んだ公開設定を sessionStorage に保存する。
const setStoredCreatePlanPublic = (isPublic) => {
  try {
    sessionStorage.setItem(
      CREATE_PLAN_PUBLIC_STORAGE_KEY,
      isPublic ? "1" : "0",
    );
  } catch {
    return;
  }
};

// 新規作成開始時に前回の公開設定をクリアする。
const clearStoredCreatePlanPublic = () => {
  try {
    sessionStorage.removeItem(CREATE_PLAN_PUBLIC_STORAGE_KEY);
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
const dispatchPlanDateChange = (dateText, detail = {}) => {
  document.dispatchEvent(
    new CustomEvent("tripCompassPlanDateChange", {
      detail: {
        dateText,
        ...detail,
      },
    }),
  );
};

// しおり編集画面上部の日付表示を更新する。
const updatePlanSummaryDateText = (dateText) => {
  const planDateText = document.querySelector(".p-plan__kvDateText");

  if (planDateText instanceof HTMLElement) {
    planDateText.textContent = dateText;
  }
};

// 日付入力に flatpickr を設定し、選択結果を画面と保存領域へ同期する。
const setupCreateDatePicker = () => {
  const input = document.querySelector("#date");
  const planDateButton = document.querySelector("[data-plan-date-edit]");

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.classList.contains("p-create__input")) {
    clearStoredCreatePlanDate();
    input.value = "";
  }

  const updatePlanDateText = (dateStr = getStoredCreatePlanDate()) => {
    updatePlanSummaryDateText(dateStr);
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
    onChange: (selectedDates, dateStr) => {
      setStoredCreatePlanDate(dateStr);
      updatePlanDateText(dateStr);
      dispatchPlanDateChange(dateStr, {
        selectedDateCount: selectedDates.length,
        isRangeSelectionInProgress:
          selectedDates.length === 1 && !dateStr.includes(" 〜 "),
      });
    },
  });

  input.addEventListener("change", () => {
    setStoredCreatePlanDate(input.value);
    updatePlanDateText(input.value);
    dispatchPlanDateChange(input.value, {
      isRangeSelectionInProgress: false,
    });
  });

  if (planDateButton instanceof HTMLButtonElement) {
    planDateButton.addEventListener("click", () => {
      picker.open();
    });
  }

  updatePlanDateText();
};

// 新規作成画面の公開設定を保存領域へ同期する。
const setupCreatePublishCheckbox = () => {
  const checkbox = document.querySelector("[data-create-public]");

  if (!(checkbox instanceof HTMLInputElement)) {
    return;
  }

  clearStoredCreatePlanPublic();
  checkbox.checked = false;
  setStoredCreatePlanPublic(checkbox.checked);

  checkbox.addEventListener("change", () => {
    setStoredCreatePlanPublic(checkbox.checked);
  });
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupCreateDatePicker();
      setupCreatePublishCheckbox();
    },
    {
      once: true,
    },
  );
} else {
  setupCreateDatePicker();
  setupCreatePublishCheckbox();
}
