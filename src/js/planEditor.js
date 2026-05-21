// しおり編集で使う保存キーと固定値。
const PLAN_DRAFT_STORAGE_KEY = "tripCompassPlanDraft";
const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const PLAN_HISTORY_STORAGE_KEY = "tripCompassPlanHistory";
const CREATE_PLAN_DESTINATIONS_STORAGE_KEY =
  "tripCompassCreatePlanDestinations";
const CREATE_PLAN_DATE_STORAGE_KEY = "tripCompassCreatePlanDate";
const CREATE_PLAN_PUBLIC_STORAGE_KEY = "tripCompassCreatePlanPublic";
const JAPANESE_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const PLAN_DAY_PIN_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea"];
const ESSENTIAL_BELONGINGS_CATEGORY = "essentials";
const ELECTRONICS_BELONGINGS_CATEGORY = "electronics";
const CLOTHING_BELONGINGS_CATEGORY = "clothes";
const DAILY_BELONGINGS_CATEGORY = "daily";
const USEFUL_BELONGINGS_CATEGORY = "useful";
const DOMESTIC_ESSENTIAL_BELONGINGS_LABELS = [
  "財布",
  "クレジットカード",
  "現金",
  "保険証",
  "マイナンバーカード",
  "チケット",
];
const INTERNATIONAL_ESSENTIAL_BELONGINGS_LABELS = [
  "パスポート",
  "パスポートのコピー",
  "航空券・eチケット",
  "現金",
  "財布",
  "クレジットカード",
];
const REQUIRED_ELECTRONICS_BELONGINGS_LABELS = ["スマートフォン", "充電機器"];
const REQUIRED_CLOTHING_BELONGINGS_LABELS = ["着替え"];
const REQUIRED_DAILY_BELONGINGS_LABELS = [
  "歯ブラシ・歯磨き粉",
  "ポケットティッシュ",
  "ウェットティッシュ",
  "常備薬",
];
const REQUIRED_USEFUL_BELONGINGS_LABELS = [
  "折りたたみ傘",
  "レインコート",
  "ペン",
  "使い捨てマスク",
  "ビニール袋・ジップロック",
  "帽子",
  "洗濯ネット",
  "圧縮袋",
  "ネックピロー",
  "アイマスク",
  "耳栓",
  "割り箸・スプーン",
  "使い捨てスリッパ",
  "電源タップ・延長コード",
];
const PLAN_MONEY_DEFAULT_CURRENCY = "JPY";
const PLAN_MONEY_CURRENCIES = [
  {
    code: "JPY",
    label: "円",
  },
  {
    code: "KRW",
    label: "ウォン",
  },
  {
    code: "TWD",
    label: "台湾ドル",
  },
];
const PLAN_MONEY_PURPOSES = [
  {
    value: "flight",
    label: "フライト",
    icon: "/src/assets/common/plane-icon-green.svg",
  },
  {
    value: "food",
    label: "食費",
    icon: "/src/assets/common/food-icon-green.svg",
  },
  {
    value: "hotel",
    label: "宿泊費",
    icon: "/src/assets/common/hotel-icon-green.svg",
  },
  {
    value: "transport",
    label: "交通費",
    icon: "/src/assets/common/train-icon-green.svg",
  },
  {
    value: "activity",
    label: "観光・体験",
    icon: "/src/assets/common/festival-icon-green.svg",
  },
  {
    value: "shopping",
    label: "買い物",
    icon: "/src/assets/common/shopping-icon-green.svg",
  },
  {
    value: "other",
    label: "その他",
    icon: "/src/assets/common/pay-icon-gray.svg",
  },
];
const PLAN_MONEY_FALLBACK_ICON = "/src/assets/common/pay-icon-gray.svg";

// 行動予定の空データを作る。
const createAction = () => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  time: "",
  title: "",
  place: "",
  memo: "",
});

// しおり保存用の ID を作る。
const createPlanId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// 保存済みの行動データを編集画面で扱える形へ整える。
const normalizeAction = (action) => ({
  id: typeof action?.id === "string" ? action.id : createAction().id,
  time: typeof action?.time === "string" ? action.time : "",
  title: typeof action?.title === "string" ? action.title : "",
  place: typeof action?.place === "string" ? action.place : "",
  memo: typeof action?.memo === "string" ? action.memo : "",
});

// 選択済みスポットを保存・描画で扱える形式にそろえる。
const normalizeSelectedSpot = (spot) => {
  if (
    !spot ||
    typeof spot.dayKey !== "string" ||
    typeof spot.id !== "string" ||
    typeof spot.name !== "string"
  ) {
    return null;
  }

  return {
    dayKey: spot.dayKey,
    id: spot.id,
    name: spot.name,
    meta: typeof spot.meta === "string" ? spot.meta : "",
    address: typeof spot.address === "string" ? spot.address : "",
    startTime: typeof spot.startTime === "string" ? spot.startTime : "",
    endTime: typeof spot.endTime === "string" ? spot.endTime : "",
    costAmount: typeof spot.costAmount === "string" ? spot.costAmount : "",
    costCurrency:
      typeof spot.costCurrency === "string" ? spot.costCurrency : "JPY",
    costPurpose: typeof spot.costPurpose === "string" ? spot.costPurpose : "",
    link: typeof spot.link === "string" ? spot.link : "",
  };
};

// 持ち物リストの保存データをカテゴリ・位置・名称だけにそろえる。
const normalizeBelongingItem = (item) => {
  if (
    !item ||
    typeof item.category !== "string" ||
    !Number.isInteger(item.index) ||
    typeof item.label !== "string"
  ) {
    return null;
  }

  return {
    category: item.category,
    index: item.index,
    label: item.label,
  };
};

// 保存済み・新規のしおりデータを不足のない編集用データへ整える。
const normalizePlan = (plan) => {
  const actions = Array.isArray(plan?.actions)
    ? plan.actions.map(normalizeAction)
    : [];
  const selectedSpots = Array.isArray(plan?.selectedSpots)
    ? plan.selectedSpots.map(normalizeSelectedSpot).filter(Boolean)
    : [];
  const belongings = Array.isArray(plan?.belongings)
    ? plan.belongings.map(normalizeBelongingItem).filter(Boolean)
    : [];
  const destinations = Array.isArray(plan?.destinations)
    ? plan.destinations.filter((destination) => {
        return (
          destination &&
          typeof destination.id === "string" &&
          typeof destination.name === "string"
        );
      })
    : [];

  return {
    id: typeof plan?.id === "string" ? plan.id : createPlanId(),
    createdAt:
      typeof plan?.createdAt === "string"
        ? plan.createdAt
        : new Date().toISOString(),
    title: typeof plan?.title === "string" ? plan.title : "",
    dateText: typeof plan?.dateText === "string" ? plan.dateText : "",
    isPublic: plan?.isPublic === true,
    memo: typeof plan?.memo === "string" ? plan.memo : "",
    destinations,
    actions: actions.length > 0 ? actions : [createAction()],
    selectedSpots,
    belongings,
  };
};

// 履歴管理用にしおりデータをディープコピーする。
const clonePlan = (plan) => JSON.parse(JSON.stringify(plan));

// 旅行先に海外が含まれるか判定する。
const hasInternationalDestination = (destinations) => {
  return Array.isArray(destinations)
    ? destinations.some((destination) => {
        return destination?.country && destination.country !== "日本";
      })
    : false;
};

// 持ち物リストへ追加する1件分の DOM を作る。
const createBelongingItemElement = (label) => {
  const item = document.createElement("li");
  const checkLabel = document.createElement("label");
  const checkbox = document.createElement("input");
  const checkButton = document.createElement("span");
  const checkText = document.createElement("span");
  const actions = document.createElement("div");
  const editButton = document.createElement("button");
  const editIcon = document.createElement("img");
  const deleteButton = document.createElement("button");
  const deleteIcon = document.createElement("img");

  item.className = "p-plan__belongingsItem";
  checkLabel.className = "p-plan__belongingsCheck";

  checkbox.className = "p-plan__belongingsCheckbox";
  checkbox.type = "checkbox";

  checkButton.className = "p-plan__belongingsCheckButton";
  checkButton.setAttribute("aria-hidden", "true");

  checkText.className = "p-plan__belongingsCheckText";
  checkText.textContent = label;

  actions.className = "p-plan__belongingsActions";

  editButton.className = "p-plan__belongingsAction";
  editButton.type = "button";
  editButton.setAttribute("aria-label", "持ち物を編集");
  editButton.dataset.belongingsEdit = "";

  editIcon.src = "/src/assets/common/pencil-icon-green.svg";
  editIcon.alt = "";

  deleteButton.className = "p-plan__belongingsAction";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", "持ち物を削除");
  deleteButton.dataset.belongingsDelete = "";

  deleteIcon.src = "/src/assets/common/delete-icon-green.svg";
  deleteIcon.alt = "";

  checkLabel.append(checkbox, checkButton, checkText);
  editButton.appendChild(editIcon);
  deleteButton.appendChild(deleteIcon);
  actions.append(editButton, deleteButton);
  item.append(checkLabel, actions);

  return item;
};

// 国内旅行時の必須持ち物を画面上の初期リストへ追加する。
const ensureDomesticEssentialBelongingsInDom = () => {
  const essentialPanel = document.querySelector(
    `[data-belongings-panel="${ESSENTIAL_BELONGINGS_CATEGORY}"]`,
  );

  if (!(essentialPanel instanceof HTMLElement)) {
    return;
  }

  const list = essentialPanel.querySelector(".p-plan__belongingsList");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const existingLabels = [
    ...list.querySelectorAll(".p-plan__belongingsCheckText"),
  ]
    .filter((text) => text instanceof HTMLElement)
    .map((text) => text.textContent.trim());

  DOMESTIC_ESSENTIAL_BELONGINGS_LABELS.forEach((label) => {
    if (existingLabels.includes(label)) {
      return;
    }

    list.append(createBelongingItemElement(label));
  });
};

// 国内旅行時の必須持ち物を保存用データにも反映する。
const ensureDomesticEssentialBelongingsInState = (belongings) => {
  if (!Array.isArray(belongings)) {
    return [];
  }

  const missingLabels = DOMESTIC_ESSENTIAL_BELONGINGS_LABELS.filter((label) => {
    return !belongings.some((belonging) => {
      return (
        belonging.category === ESSENTIAL_BELONGINGS_CATEGORY &&
        belonging.label === label
      );
    });
  });

  if (missingLabels.length === 0) {
    return belongings;
  }

  return [
    ...missingLabels.map((label, index) => {
      return {
        category: ESSENTIAL_BELONGINGS_CATEGORY,
        index,
        label,
      };
    }),
    ...belongings.map((belonging) => {
      if (belonging.category !== ESSENTIAL_BELONGINGS_CATEGORY) {
        return belonging;
      }

      return {
        ...belonging,
        index: belonging.index + missingLabels.length,
      };
    }),
  ];
};

// 海外旅行時の必須持ち物を画面上の初期リストへ追加する。
const ensureInternationalEssentialBelongingsInDom = () => {
  const essentialPanel = document.querySelector(
    `[data-belongings-panel="${ESSENTIAL_BELONGINGS_CATEGORY}"]`,
  );

  if (!(essentialPanel instanceof HTMLElement)) {
    return;
  }

  const list = essentialPanel.querySelector(".p-plan__belongingsList");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const existingLabels = [
    ...list.querySelectorAll(".p-plan__belongingsCheckText"),
  ]
    .filter((text) => text instanceof HTMLElement)
    .map((text) => text.textContent.trim());

  INTERNATIONAL_ESSENTIAL_BELONGINGS_LABELS.slice()
    .reverse()
    .forEach((label) => {
      if (existingLabels.includes(label)) {
        return;
      }

      list.append(createBelongingItemElement(label));
    });
};

// 海外旅行時の必須持ち物を保存用データにも反映する。
const ensureInternationalEssentialBelongingsInState = (belongings) => {
  if (!Array.isArray(belongings)) {
    return [];
  }

  const missingLabels = INTERNATIONAL_ESSENTIAL_BELONGINGS_LABELS.filter(
    (label) => {
      return !belongings.some((belonging) => {
        return (
          belonging.category === ESSENTIAL_BELONGINGS_CATEGORY &&
          belonging.label === label
        );
      });
    },
  );

  if (missingLabels.length === 0) {
    return belongings;
  }

  return [
    ...missingLabels.map((label, index) => {
      return {
        category: ESSENTIAL_BELONGINGS_CATEGORY,
        index,
        label,
      };
    }),
    ...belongings.map((belonging) => {
      if (belonging.category !== ESSENTIAL_BELONGINGS_CATEGORY) {
        return belonging;
      }

      return {
        ...belonging,
        index: belonging.index + missingLabels.length,
      };
    }),
  ];
};

// 旅行種別に関係なく必要な電子機器を画面上の初期リストへ追加する。
const ensureRequiredElectronicsBelongingsInDom = () => {
  const electronicsPanel = document.querySelector(
    `[data-belongings-panel="${ELECTRONICS_BELONGINGS_CATEGORY}"]`,
  );

  if (!(electronicsPanel instanceof HTMLElement)) {
    return;
  }

  const list = electronicsPanel.querySelector(".p-plan__belongingsList");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const existingLabels = [
    ...list.querySelectorAll(".p-plan__belongingsCheckText"),
  ]
    .filter((text) => text instanceof HTMLElement)
    .map((text) => text.textContent.trim());

  REQUIRED_ELECTRONICS_BELONGINGS_LABELS.forEach((label) => {
    if (existingLabels.includes(label)) {
      return;
    }

    list.append(createBelongingItemElement(label));
  });
};

// 旅行種別に関係なく必要な電子機器を保存用データにも反映する。
const ensureRequiredElectronicsBelongingsInState = (belongings) => {
  if (!Array.isArray(belongings)) {
    return [];
  }

  const missingLabels = REQUIRED_ELECTRONICS_BELONGINGS_LABELS.filter(
    (label) => {
      return !belongings.some((belonging) => {
        return (
          belonging.category === ELECTRONICS_BELONGINGS_CATEGORY &&
          belonging.label === label
        );
      });
    },
  );

  if (missingLabels.length === 0) {
    return belongings;
  }

  return [
    ...missingLabels.map((label, index) => {
      return {
        category: ELECTRONICS_BELONGINGS_CATEGORY,
        index,
        label,
      };
    }),
    ...belongings.map((belonging) => {
      if (belonging.category !== ELECTRONICS_BELONGINGS_CATEGORY) {
        return belonging;
      }

      return {
        ...belonging,
        index: belonging.index + missingLabels.length,
      };
    }),
  ];
};

// 旅行種別に関係なく必要な衣類を画面上の初期リストへ追加する。
const ensureRequiredClothingBelongingsInDom = () => {
  const clothingPanel = document.querySelector(
    `[data-belongings-panel="${CLOTHING_BELONGINGS_CATEGORY}"]`,
  );

  if (!(clothingPanel instanceof HTMLElement)) {
    return;
  }

  const list = clothingPanel.querySelector(".p-plan__belongingsList");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const existingLabels = [
    ...list.querySelectorAll(".p-plan__belongingsCheckText"),
  ]
    .filter((text) => text instanceof HTMLElement)
    .map((text) => text.textContent.trim());

  REQUIRED_CLOTHING_BELONGINGS_LABELS.forEach((label) => {
    if (existingLabels.includes(label)) {
      return;
    }

    list.append(createBelongingItemElement(label));
  });
};

// 旅行種別に関係なく必要な衣類を保存用データにも反映する。
const ensureRequiredClothingBelongingsInState = (belongings) => {
  if (!Array.isArray(belongings)) {
    return [];
  }

  const missingLabels = REQUIRED_CLOTHING_BELONGINGS_LABELS.filter((label) => {
    return !belongings.some((belonging) => {
      return (
        belonging.category === CLOTHING_BELONGINGS_CATEGORY &&
        belonging.label === label
      );
    });
  });

  if (missingLabels.length === 0) {
    return belongings;
  }

  return [
    ...missingLabels.map((label, index) => {
      return {
        category: CLOTHING_BELONGINGS_CATEGORY,
        index,
        label,
      };
    }),
    ...belongings.map((belonging) => {
      if (belonging.category !== CLOTHING_BELONGINGS_CATEGORY) {
        return belonging;
      }

      return {
        ...belonging,
        index: belonging.index + missingLabels.length,
      };
    }),
  ];
};

// 旅行種別に関係なく必要な日用品を画面上の初期リストへ追加する。
const ensureRequiredDailyBelongingsInDom = () => {
  const dailyPanel = document.querySelector(
    `[data-belongings-panel="${DAILY_BELONGINGS_CATEGORY}"]`,
  );

  if (!(dailyPanel instanceof HTMLElement)) {
    return;
  }

  const list = dailyPanel.querySelector(".p-plan__belongingsList");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const existingLabels = [
    ...list.querySelectorAll(".p-plan__belongingsCheckText"),
  ]
    .filter((text) => text instanceof HTMLElement)
    .map((text) => text.textContent.trim());

  REQUIRED_DAILY_BELONGINGS_LABELS.forEach((label) => {
    if (existingLabels.includes(label)) {
      return;
    }

    list.append(createBelongingItemElement(label));
  });
};

// 旅行種別に関係なく必要な日用品を保存用データにも反映する。
const ensureRequiredDailyBelongingsInState = (belongings) => {
  if (!Array.isArray(belongings)) {
    return [];
  }

  const missingLabels = REQUIRED_DAILY_BELONGINGS_LABELS.filter((label) => {
    return !belongings.some((belonging) => {
      return (
        belonging.category === DAILY_BELONGINGS_CATEGORY &&
        belonging.label === label
      );
    });
  });

  if (missingLabels.length === 0) {
    return belongings;
  }

  return [
    ...missingLabels.map((label, index) => {
      return {
        category: DAILY_BELONGINGS_CATEGORY,
        index,
        label,
      };
    }),
    ...belongings.map((belonging) => {
      if (belonging.category !== DAILY_BELONGINGS_CATEGORY) {
        return belonging;
      }

      return {
        ...belonging,
        index: belonging.index + missingLabels.length,
      };
    }),
  ];
};

// 旅行種別に関係なく便利な持ち物を画面上の初期リストへ追加する。
const ensureRequiredUsefulBelongingsInDom = () => {
  const usefulPanel = document.querySelector(
    `[data-belongings-panel="${USEFUL_BELONGINGS_CATEGORY}"]`,
  );

  if (!(usefulPanel instanceof HTMLElement)) {
    return;
  }

  const list = usefulPanel.querySelector(".p-plan__belongingsList");

  if (!(list instanceof HTMLElement)) {
    return;
  }

  const existingLabels = [
    ...list.querySelectorAll(".p-plan__belongingsCheckText"),
  ]
    .filter((text) => text instanceof HTMLElement)
    .map((text) => text.textContent.trim());

  REQUIRED_USEFUL_BELONGINGS_LABELS.forEach((label) => {
    if (existingLabels.includes(label)) {
      return;
    }

    list.append(createBelongingItemElement(label));
  });
};

// 旅行種別に関係なく便利な持ち物を保存用データにも反映する。
const ensureRequiredUsefulBelongingsInState = (belongings) => {
  if (!Array.isArray(belongings)) {
    return [];
  }

  const missingLabels = REQUIRED_USEFUL_BELONGINGS_LABELS.filter((label) => {
    return !belongings.some((belonging) => {
      return (
        belonging.category === USEFUL_BELONGINGS_CATEGORY &&
        belonging.label === label
      );
    });
  });

  if (missingLabels.length === 0) {
    return belongings;
  }

  return [
    ...missingLabels.map((label, index) => {
      return {
        category: USEFUL_BELONGINGS_CATEGORY,
        index,
        label,
      };
    }),
    ...belongings.map((belonging) => {
      if (belonging.category !== USEFUL_BELONGINGS_CATEGORY) {
        return belonging;
      }

      return {
        ...belonging,
        index: belonging.index + missingLabels.length,
      };
    }),
  ];
};

// 現在表示されている持ち物リストを保存用データへ変換する。
const getBelongingsStateFromDom = () => {
  return [...document.querySelectorAll("[data-belongings-panel]")]
    .filter((panel) => panel instanceof HTMLElement)
    .flatMap((panel) => {
      const category = panel.dataset.belongingsPanel;

      if (!category) {
        return [];
      }

      return [...panel.querySelectorAll(".p-plan__belongingsItem")].map(
        (item, index) => {
          const text = item.querySelector(".p-plan__belongingsCheckText");
          const input = item.querySelector(".p-plan__belongingsEditInput");
          const label =
            input instanceof HTMLInputElement
              ? input.value.trim()
              : text instanceof HTMLElement
                ? text.textContent.trim()
                : "";

          return {
            category,
            index,
            label,
          };
        },
      );
    });
};

// 保存済みの持ち物データを画面上のリストへ再描画する。
const applyBelongingsStateToDom = (belongings) => {
  const panels = [
    ...document.querySelectorAll("[data-belongings-panel]"),
  ].filter((panel) => panel instanceof HTMLElement);

  panels.forEach((panel) => {
    const list = panel.querySelector(".p-plan__belongingsList");

    if (list instanceof HTMLElement) {
      list.textContent = "";
    }
  });

  if (!Array.isArray(belongings) || belongings.length === 0) {
    return;
  }

  belongings
    .slice()
    .sort((belongingA, belongingB) => belongingA.index - belongingB.index)
    .forEach((belonging) => {
      const panel = panels.find((element) => {
        return element.dataset.belongingsPanel === belonging.category;
      });

      if (!(panel instanceof HTMLElement)) {
        return;
      }

      const list = panel.querySelector(".p-plan__belongingsList");

      if (!(list instanceof HTMLElement) || !belonging.label.trim()) {
        return;
      }

      list.append(createBelongingItemElement(belonging.label));
    });
};

// 各カテゴリーへ持ち物を追加するフォームを差し込む。
const setupBelongingsAddForms = () => {
  const belongings = document.querySelector(".p-plan__belongings");

  if (!(belongings instanceof HTMLElement)) {
    return;
  }

  const panels = [
    ...belongings.querySelectorAll("[data-belongings-panel]"),
  ].filter((panel) => panel instanceof HTMLElement);

  panels.forEach((panel) => {
    const list = panel.querySelector(".p-plan__belongingsList");

    if (
      !(list instanceof HTMLElement) ||
      panel.querySelector("[data-belongings-add-form]")
    ) {
      return;
    }

    const form = document.createElement("form");
    const input = document.createElement("input");
    const button = document.createElement("button");

    form.className = "p-plan__belongingsAddForm";
    form.dataset.belongingsAddForm = "";

    input.className = "p-plan__belongingsAddInput";
    input.type = "text";
    input.placeholder = "持ち物を追加";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "追加する持ち物");

    button.className = "p-plan__belongingsAddButton";
    button.type = "submit";
    button.textContent = "追加";

    form.append(input, button);
    list.after(form);
  });
};

// 日付表示で使う2桁表記へ整える。
const padDateNumber = (value) => String(value).padStart(2, "0");

// YYYY/MM/DD の文字列を Date へ変換し、不正な日付は破棄する。
const parsePlanDateValue = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

// 日程リストに表示する曜日付きラベルを作る。
const formatPlanDayLabel = (date) => {
  const year = date.getFullYear();
  const month = padDateNumber(date.getMonth() + 1);
  const day = padDateNumber(date.getDate());
  const weekday = JAPANESE_WEEKDAYS[date.getDay()];

  return `${year}/${month}/${day}（${weekday}）`;
};

// 日別スポット管理で使う安定したキーを作る。
const formatPlanDayKey = (date) => {
  return [
    date.getFullYear(),
    padDateNumber(date.getMonth() + 1),
    padDateNumber(date.getDate()),
  ].join("-");
};

// 選択された開始日から終了日までの日別データを作る。
const getPlanDayItems = (dateText) => {
  const values =
    typeof dateText === "string"
      ? dateText
          .split(" 〜 ")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  const startDate = parsePlanDateValue(values[0]);
  const endDate = parsePlanDateValue(values.at(-1)) || startDate;

  if (!startDate || !endDate) {
    return [];
  }

  const items = [];
  const currentDate = new Date(startDate);
  const lastDate =
    endDate.getTime() < startDate.getTime() ? startDate : endDate;

  while (currentDate.getTime() <= lastDate.getTime()) {
    items.push({
      key: formatPlanDayKey(currentDate),
      label: formatPlanDayLabel(currentDate),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return items;
};

// 日程変更時、同じ日数目のスポットと費用を新しい日付へ移す。
const syncSelectedSpotsToDateText = (
  selectedSpots,
  previousDateText,
  nextDateText,
) => {
  if (!Array.isArray(selectedSpots)) {
    return [];
  }

  const previousDayItems = getPlanDayItems(previousDateText);
  const nextDayItems = getPlanDayItems(nextDateText);

  if (nextDayItems.length === 0) {
    return [];
  }

  const nextDayKeys = new Set(nextDayItems.map((dayItem) => dayItem.key));
  const nextDayKeyByPreviousDayKey = new Map(
    previousDayItems
      .map((dayItem, index) => {
        const nextDayItem = nextDayItems[index];

        return nextDayItem ? [dayItem.key, nextDayItem.key] : null;
      })
      .filter(Boolean),
  );

  return selectedSpots
    .map((spot) => {
      const normalizedSpot = normalizeSelectedSpot(spot);

      if (!normalizedSpot) {
        return null;
      }

      if (nextDayKeys.has(normalizedSpot.dayKey)) {
        return normalizedSpot;
      }

      return {
        ...normalizedSpot,
        dayKey:
          nextDayKeyByPreviousDayKey.get(normalizedSpot.dayKey) ||
          normalizedSpot.dayKey,
      };
    })
    .filter(Boolean);
};

const getPlanMoneyCurrencyLabel = (currencyCode) => {
  return (
    PLAN_MONEY_CURRENCIES.find((currency) => currency.code === currencyCode)
      ?.label || PLAN_MONEY_CURRENCIES[0].label
  );
};

const getPlanMoneyPurpose = (purposeValue) => {
  return (
    PLAN_MONEY_PURPOSES.find((purpose) => purpose.value === purposeValue) ||
    PLAN_MONEY_PURPOSES[PLAN_MONEY_PURPOSES.length - 1]
  );
};

const formatPlanMoneyAmount = (amount) => {
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

const formatPlanMoneyCost = (spot) => {
  return `${formatPlanMoneyAmount(spot.costAmount)} ${getPlanMoneyCurrencyLabel(
    spot.costCurrency || PLAN_MONEY_DEFAULT_CURRENCY,
  )}`;
};

const createPlanMoneyIcon = (purposeValue) => {
  const icon = document.createElement("span");
  const image = document.createElement("img");
  const purpose = getPlanMoneyPurpose(purposeValue);

  icon.className = "p-plan__moneyIcon";
  image.src = purpose?.icon || PLAN_MONEY_FALLBACK_ICON;
  image.alt = "";
  image.draggable = false;
  image.addEventListener("error", () => {
    if (image.dataset.fallbackApplied === "1") {
      return;
    }

    image.dataset.fallbackApplied = "1";
    image.src = PLAN_MONEY_FALLBACK_ICON;
  });
  icon.appendChild(image);

  return icon;
};

const createPlanMoneyItem = (spot, dayLabel) => {
  const item = document.createElement("li");
  const content = document.createElement("span");
  const head = document.createElement("span");
  const purposeText = document.createElement("span");
  const placeText = document.createElement("span");
  const metaText = document.createElement("span");
  const amountText = document.createElement("strong");
  const purpose = getPlanMoneyPurpose(spot.costPurpose);

  item.className = "p-plan__moneyItem";
  content.className = "p-plan__moneyContent";
  head.className = "p-plan__moneyHead";
  placeText.className = "p-plan__moneyPlace";
  metaText.className = "p-plan__moneyMeta";
  amountText.className = "p-plan__moneyAmount";

  placeText.textContent = spot.name;
  metaText.textContent = dayLabel;
  amountText.textContent = formatPlanMoneyCost(spot);

  head.append(placeText);
  content.append(head);

  if (dayLabel) {
    content.appendChild(metaText);
  }

  item.append(createPlanMoneyIcon(spot.costPurpose), content, amountText);

  return item;
};

const getPlanMoneyTotals = (costSpots) => {
  const totals = new Map();

  costSpots.forEach((spot) => {
    const amount = Number(String(spot.costAmount || "").trim());

    if (!Number.isFinite(amount)) {
      return;
    }

    const currency = spot.costCurrency || PLAN_MONEY_DEFAULT_CURRENCY;
    totals.set(currency, (totals.get(currency) || 0) + amount);
  });

  return [...totals.entries()].sort(([currencyA], [currencyB]) => {
    const indexA = PLAN_MONEY_CURRENCIES.findIndex((currency) => {
      return currency.code === currencyA;
    });
    const indexB = PLAN_MONEY_CURRENCIES.findIndex((currency) => {
      return currency.code === currencyB;
    });

    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
};

const createPlanMoneyTotal = (costSpots) => {
  const totals = getPlanMoneyTotals(costSpots);
  const total = document.createElement("div");
  const label = document.createElement("span");
  const amountList = document.createElement("span");

  total.className = "p-plan__moneyTotal";
  label.className = "p-plan__moneyTotalLabel";
  label.textContent = "合計金額";
  amountList.className = "p-plan__moneyTotalList";

  totals.forEach(([currency, amount]) => {
    const amountText = document.createElement("strong");

    amountText.className = "p-plan__moneyTotalAmount";
    amountText.textContent = `${formatPlanMoneyAmount(
      String(amount),
    )} ${getPlanMoneyCurrencyLabel(currency)}`;
    amountList.appendChild(amountText);
  });

  total.append(label, amountList);

  return totals.length > 0 ? total : null;
};

const renderPlanMoneyList = (selectedSpots, dateText) => {
  const moneyBody = document.querySelector("[data-plan-money]");

  if (!(moneyBody instanceof HTMLElement)) {
    return;
  }

  moneyBody.textContent = "";

  const validDayKeys = new Set(
    getPlanDayItems(dateText).map((dayItem) => dayItem.key),
  );
  const costSpots = Array.isArray(selectedSpots)
    ? selectedSpots.filter((spot) => {
        return (
          validDayKeys.has(spot?.dayKey) &&
          String(spot?.costAmount || "").trim()
        );
      })
    : [];

  if (costSpots.length === 0) {
    const emptyText = document.createElement("p");

    emptyText.className = "p-plan__moneyEmpty";
    emptyText.textContent = "日程で費用を追加するとここに表示されます";
    moneyBody.appendChild(emptyText);
    return;
  }

  const dayLabels = new Map(
    getPlanDayItems(dateText).map((dayItem) => [dayItem.key, dayItem.label]),
  );
  const list = document.createElement("ul");

  list.className = "p-plan__moneyList";
  costSpots.forEach((spot) => {
    list.appendChild(
      createPlanMoneyItem(spot, dayLabels.get(spot.dayKey) || ""),
    );
  });
  moneyBody.appendChild(list);

  const total = createPlanMoneyTotal(costSpots);

  if (total) {
    moneyBody.appendChild(total);
  }
};

// しおり編集画面上部の日付表示を更新する。
const updatePlanSummaryDateText = (dateText) => {
  const summaryDateText = document.querySelector(".p-plan__kvDateText");

  if (summaryDateText instanceof HTMLElement) {
    summaryDateText.textContent = dateText;
  }
};

// 日別のスポット追加欄を作る。
const createPlanDateItem = (dayItem, index) => {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const dateText = document.createElement("span");
  const toggle = document.createElement("span");
  const panel = document.createElement("div");
  const dateRelative = document.createElement("div");
  const input = document.createElement("input");
  const suggestions = document.createElement("ul");
  const icon = document.createElement("div");
  const iconImage = document.createElement("img");

  details.className = "p-plan__dateItem";
  details.open = index === 0;

  summary.className = "p-plan__dateSummary";
  dateText.className = "p-plan__dateText";
  dateText.textContent = dayItem.label;
  toggle.className = "p-plan__dateToggle";
  toggle.setAttribute("aria-hidden", "true");
  summary.append(dateText, toggle);

  panel.className = "p-plan__datePanel";
  dateRelative.className = "p-plan__dateRelative";

  input.type = "text";
  input.placeholder = "スポットを追加";
  input.autocomplete = "off";
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.dataset.planSpotInput = "";
  input.dataset.planDayKey = dayItem.key;
  input.dataset.planDayIndex = String(index);

  suggestions.className = "p-plan__spotSuggestions";
  suggestions.dataset.planSpotSuggestions = "";
  suggestions.hidden = true;

  icon.className = "p-plan__dateIcon";
  iconImage.src = "/src/assets/common/pin-icon-green.svg";
  iconImage.alt = "";
  icon.style.color = PLAN_DAY_PIN_COLORS[index % PLAN_DAY_PIN_COLORS.length];
  icon.appendChild(iconImage);

  dateRelative.append(input, suggestions, icon);
  panel.appendChild(dateRelative);
  details.append(summary, panel);

  return details;
};

// 日程に応じて日別スポット入力欄を描画する。
const renderPlanDateList = (dateText) => {
  const dateList = document.querySelector(".p-plan__dateList");

  if (!(dateList instanceof HTMLElement)) {
    return;
  }

  dateList.textContent = "";

  const dayItems = getPlanDayItems(dateText);

  if (dayItems.length === 0) {
    const emptyText = document.createElement("p");

    emptyText.className = "p-plan__dateEmpty";
    emptyText.textContent = "日程を選択してください";
    dateList.appendChild(emptyText);
  } else {
    dayItems.forEach((dayItem, index) => {
      dateList.appendChild(createPlanDateItem(dayItem, index));
    });
  }

  document.dispatchEvent(
    new CustomEvent("tripCompassPlanDatesRendered", {
      detail: {
        dayCount: dayItems.length,
      },
    }),
  );
};

// Undo 履歴へ積む必要があるか、2つのしおりデータを比較する。
const isSamePlan = (planA, planB) => {
  return JSON.stringify(planA) === JSON.stringify(planB);
};

// 編集中の下書きしおりを localStorage から取得する。
const getStoredPlan = () => {
  try {
    const storedPlan = JSON.parse(
      localStorage.getItem(PLAN_DRAFT_STORAGE_KEY) || "null",
    );

    return storedPlan ? normalizePlan(storedPlan) : null;
  } catch {
    return null;
  }
};

// 編集中の下書きしおりを localStorage に保存する。
const setStoredPlan = (plan) => {
  try {
    localStorage.setItem(PLAN_DRAFT_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    return;
  }
};

// Undo/Redo 履歴全体を localStorage から取得する。
const getStoredPlanHistories = () => {
  try {
    const histories = JSON.parse(
      localStorage.getItem(PLAN_HISTORY_STORAGE_KEY) || "{}",
    );

    return histories &&
      typeof histories === "object" &&
      !Array.isArray(histories)
      ? histories
      : {};
  } catch {
    return {};
  }
};

// Undo/Redo 履歴全体を localStorage に保存する。
const setStoredPlanHistories = (histories) => {
  try {
    localStorage.setItem(PLAN_HISTORY_STORAGE_KEY, JSON.stringify(histories));
  } catch {
    return;
  }
};

// 保存済み履歴を、現在のしおり ID に紐づく状態だけへ整える。
const normalizePlanHistoryStack = (stack, planId) => {
  if (!Array.isArray(stack)) {
    return [];
  }

  return stack
    .filter((historyPlan) => {
      return historyPlan && typeof historyPlan === "object";
    })
    .map((historyPlan) => {
      return normalizePlan({
        ...historyPlan,
        id: typeof historyPlan.id === "string" ? historyPlan.id : planId,
      });
    })
    .filter((historyPlan) => {
      return historyPlan.id === planId;
    });
};

// 現在のしおり用の Undo/Redo 履歴を localStorage から取得する。
const getStoredPlanHistory = (planId) => {
  const history = getStoredPlanHistories()[planId];

  if (!history || typeof history !== "object") {
    return {
      undoStack: [],
      redoStack: [],
    };
  }

  return {
    undoStack: normalizePlanHistoryStack(history.undoStack, planId),
    redoStack: normalizePlanHistoryStack(history.redoStack, planId),
  };
};

// 現在のしおり用の Undo/Redo 履歴を localStorage に保存する。
const setStoredPlanHistory = (planId, history) => {
  const histories = getStoredPlanHistories();

  histories[planId] = {
    undoStack: normalizePlanHistoryStack(history.undoStack, planId),
    redoStack: normalizePlanHistoryStack(history.redoStack, planId),
  };
  setStoredPlanHistories(histories);
};

// 新規作成画面で選んだ旅行先を sessionStorage から取得する。
const getStoredCreatePlanDestinations = () => {
  try {
    const destinations = JSON.parse(
      sessionStorage.getItem(CREATE_PLAN_DESTINATIONS_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(destinations)) {
      return [];
    }

    return destinations.filter((destination) => {
      return (
        destination &&
        typeof destination.id === "string" &&
        typeof destination.name === "string"
      );
    });
  } catch {
    return [];
  }
};

// 新規作成画面で選んだ日程を sessionStorage から取得する。
const getStoredCreatePlanDate = () => {
  try {
    return sessionStorage.getItem(CREATE_PLAN_DATE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

// 新規作成画面で選んだ公開設定を sessionStorage から取得する。
const getStoredCreatePlanPublic = () => {
  try {
    return sessionStorage.getItem(CREATE_PLAN_PUBLIC_STORAGE_KEY) === "1";
  } catch {
    return false;
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

// 作成済みしおり一覧を localStorage に保存する。
const setStoredCreatedPlans = (plans) => {
  try {
    localStorage.setItem(CREATED_PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    return;
  }
};

// URL パラメータに応じて新規作成・既存編集・下書き再開を切り替える。
const getPlanFromUrl = () => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("new") === "1") {
    return null;
  }

  const planId = params.get("id");

  if (planId) {
    return (
      getStoredCreatedPlans().find((plan) => {
        return plan?.id === planId;
      }) || null
    );
  }

  return getStoredPlan();
};

// 編集中のしおりを作成済み一覧へ保存し、更新日時順に並べる。
const saveCreatedPlan = (plan) => {
  const now = new Date().toISOString();
  const createdPlan = {
    id: plan.id,
    title: plan.title.trim() || "無題のしおり",
    dateText: plan.dateText,
    isPublic: plan.isPublic === true,
    memo: plan.memo,
    destinations: plan.destinations,
    actions: plan.actions,
    selectedSpots: plan.selectedSpots,
    belongings: plan.belongings,
    createdAt: plan.createdAt,
    updatedAt: now,
  };
  const otherPlans = getStoredCreatedPlans().filter((storedPlan) => {
    return storedPlan?.id !== plan.id;
  });

  setStoredCreatedPlans(
    [createdPlan, ...otherPlans].sort((planA, planB) => {
      return (
        new Date(planB.updatedAt || planB.createdAt || 0).getTime() -
        new Date(planA.updatedAt || planA.createdAt || 0).getTime()
      );
    }),
  );
};

// 行動予定の入力欄を作る。
const createField = ({
  label,
  value,
  name,
  placeholder,
  multiline = false,
}) => {
  const field = document.createElement("label");
  const labelText = document.createElement("span");
  const input = multiline
    ? document.createElement("textarea")
    : document.createElement("input");

  field.className = "p-plan__actionField";
  labelText.className = "p-plan__actionLabel";
  labelText.textContent = label;

  input.className = "p-plan__actionInput";
  input.name = name;
  input.value = value;
  input.placeholder = placeholder;
  input.dataset.planActionField = name;

  if (input instanceof HTMLInputElement) {
    input.type = "text";
  }

  field.append(labelText, input);

  return field;
};

// 行動予定1件分の編集カードを作る。
const createActionElement = (action, index) => {
  const item = document.createElement("article");
  const header = document.createElement("div");
  const title = document.createElement("h3");
  const deleteButton = document.createElement("button");

  item.className = "p-plan__action";
  item.dataset.planActionId = action.id;

  header.className = "p-plan__actionHeader";
  title.className = "p-plan__actionTitle";
  title.textContent = `行動 ${index + 1}`;

  deleteButton.className = "p-plan__deleteButton";
  deleteButton.type = "button";
  deleteButton.textContent = "削除";
  deleteButton.dataset.planActionDelete = action.id;
  deleteButton.setAttribute("aria-label", `行動 ${index + 1}を削除`);

  header.append(title, deleteButton);
  item.append(
    header,
    createField({
      label: "時間",
      value: action.time,
      name: "time",
      placeholder: "例: 10:00",
    }),
    createField({
      label: "行動",
      value: action.title,
      name: "title",
      placeholder: "例: 清水寺を散策",
    }),
    createField({
      label: "場所",
      value: action.place,
      name: "place",
      placeholder: "例: 清水寺",
    }),
    createField({
      label: "メモ",
      value: action.memo,
      name: "memo",
      placeholder: "予約番号や持ち物など",
      multiline: true,
    }),
  );

  return item;
};

// サイドバーから各編集セクションへ移動する。
const setupPlanSidebarNavigation = () => {
  const sidebar = document.querySelector("[data-plan-editor]");

  if (!(sidebar instanceof HTMLElement)) {
    return;
  }

  const buttons = [
    ...sidebar.querySelectorAll("[data-plan-scroll-target]"),
  ].filter((button) => button instanceof HTMLButtonElement);
  const sections = buttons
    .map((button) => {
      const targetSelector = button.dataset.planScrollTarget;
      const target = targetSelector && document.querySelector(targetSelector);

      return target instanceof HTMLElement
        ? {
            button,
            target,
          }
        : null;
    })
    .filter(Boolean);

  const activateButton = (activeButton) => {
    buttons.forEach((button) => {
      const isActive = button === activeButton;

      button.classList.toggle("is-active", isActive);

      if (isActive) {
        button.setAttribute("aria-current", "true");
        return;
      }

      button.removeAttribute("aria-current");
    });
  };

  const getScrollOffset = () => {
    const fixedHeader =
      document.querySelector(".l-header") ||
      document.querySelector(".p-plan__buttonBox");

    if (!(fixedHeader instanceof HTMLElement)) {
      return 16;
    }

    return fixedHeader.getBoundingClientRect().height + 16;
  };

  const updateActiveButton = () => {
    if (sections.length === 0) {
      return;
    }

    if (window.scrollY <= 1) {
      activateButton(sections[0].button);
      return;
    }

    const activationLine = getScrollOffset() + window.innerHeight * 0.35;
    const activeSection =
      [...sections].reverse().find(({ target }) => {
        return target.getBoundingClientRect().top <= activationLine;
      }) || sections[0];

    activateButton(activeSection.button);
  };

  sidebar.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-plan-scroll-target]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const targetSelector = button.dataset.planScrollTarget;
    const target = targetSelector && document.querySelector(targetSelector);

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const targetTop =
      target.getBoundingClientRect().top + window.scrollY - getScrollOffset();

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
    target.focus({ preventScroll: true });
    activateButton(button);
  });

  updateActiveButton();
  window.addEventListener("scroll", updateActiveButton, {
    passive: true,
  });
  window.addEventListener("resize", updateActiveButton);
};

// 持ち物カテゴリーのタブ切り替えを初期化する。
const setupBelongingsTabs = () => {
  const tabRoot = document.querySelector("[data-belongings-tabs]");

  if (!(tabRoot instanceof HTMLElement)) {
    return;
  }

  const tabs = [...tabRoot.querySelectorAll("[data-belongings-tab]")].filter(
    (tab) => tab instanceof HTMLButtonElement,
  );
  const panels = [
    ...tabRoot.querySelectorAll("[data-belongings-panel]"),
  ].filter((panel) => panel instanceof HTMLElement);

  if (tabs.length === 0 || panels.length === 0) {
    return;
  }

  const activateTab = (activeTab, shouldFocus = false) => {
    const activeCategory = activeTab.dataset.belongingsTab;

    tabs.forEach((tab) => {
      const isActive = tab === activeTab;

      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.belongingsPanel === activeCategory;

      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (shouldFocus) {
      activeTab.focus();
    }
  };

  const moveTabFocus = (currentTab, direction) => {
    const currentIndex = tabs.indexOf(currentTab);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;

    activateTab(tabs[nextIndex], true);
  };

  tabRoot.addEventListener("click", (event) => {
    const tab =
      event.target instanceof Element
        ? event.target.closest("[data-belongings-tab]")
        : null;

    if (!(tab instanceof HTMLButtonElement)) {
      return;
    }

    activateTab(tab);
  });

  tabRoot.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLButtonElement)) {
      return;
    }

    if (!tabs.includes(event.target)) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveTabFocus(event.target, 1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveTabFocus(event.target, -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      activateTab(tabs[0], true);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      activateTab(tabs.at(-1), true);
    }
  });
};

// 持ち物名をインライン編集できるようにする。
const setupBelongingsItemEditing = () => {
  const belongings = document.querySelector(".p-plan__belongings");

  if (!(belongings instanceof HTMLElement)) {
    return;
  }

  const startEditing = (item) => {
    const text = item.querySelector(".p-plan__belongingsCheckText");
    const currentInput = item.querySelector(".p-plan__belongingsEditInput");

    if (currentInput instanceof HTMLInputElement) {
      currentInput.focus();
      currentInput.select();
      return;
    }

    if (!(text instanceof HTMLElement)) {
      return;
    }

    const originalText = text.textContent.trim();
    const previousBelongings = getBelongingsStateFromDom();
    const input = document.createElement("input");

    input.className = "p-plan__belongingsEditInput";
    input.type = "text";
    input.value = originalText;
    input.setAttribute("aria-label", "持ち物名");

    const finishEditing = (shouldSave) => {
      const nextText = input.value.trim();
      const label = shouldSave && nextText ? nextText : originalText;

      text.textContent = label;
      input.replaceWith(text);

      if (shouldSave && label !== originalText) {
        document.dispatchEvent(
          new CustomEvent("tripCompassPlanBelongingsChange", {
            detail: {
              previousBelongings,
              nextBelongings: getBelongingsStateFromDom(),
            },
          }),
        );
      }
    };

    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishEditing(true);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        finishEditing(false);
      }
    });

    input.addEventListener(
      "blur",
      () => {
        if (input.isConnected) {
          finishEditing(true);
        }
      },
      {
        once: true,
      },
    );

    text.replaceWith(input);
    input.focus();
    input.select();
  };

  belongings.addEventListener("click", (event) => {
    const deleteButton =
      event.target instanceof Element
        ? event.target.closest("[data-belongings-delete]")
        : null;

    if (deleteButton instanceof HTMLButtonElement) {
      const item = deleteButton.closest(".p-plan__belongingsItem");

      if (!(item instanceof HTMLElement)) {
        return;
      }

      const previousBelongings = getBelongingsStateFromDom();

      event.preventDefault();
      item.remove();
      document.dispatchEvent(
        new CustomEvent("tripCompassPlanBelongingsChange", {
          detail: {
            previousBelongings,
            nextBelongings: getBelongingsStateFromDom(),
          },
        }),
      );
      return;
    }

    const button =
      event.target instanceof Element
        ? event.target.closest("[data-belongings-edit]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const item = button.closest(".p-plan__belongingsItem");

    if (!(item instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    startEditing(item);
  });

  belongings.addEventListener("submit", (event) => {
    const form =
      event.target instanceof Element
        ? event.target.closest("[data-belongings-add-form]")
        : null;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    event.preventDefault();

    const panel = form.closest("[data-belongings-panel]");
    const list = panel?.querySelector(".p-plan__belongingsList");
    const input = form.querySelector(".p-plan__belongingsAddInput");

    if (
      !(list instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement)
    ) {
      return;
    }

    const label = input.value.trim();

    if (!label) {
      input.focus();
      return;
    }

    const previousBelongings = getBelongingsStateFromDom();

    list.append(createBelongingItemElement(label));
    input.value = "";
    input.focus();
    document.dispatchEvent(
      new CustomEvent("tripCompassPlanBelongingsChange", {
        detail: {
          previousBelongings,
          nextBelongings: getBelongingsStateFromDom(),
        },
      }),
    );
  });
};

// しおり編集画面を初期化し、入力・追加削除・Undo/Redo を管理する。
const setupPlanEditor = () => {
  const titleInput = document.querySelector(".p-plan__kvInput");
  const titleEditButton = document.querySelector("[data-plan-title-edit]");
  const memoInput = document.querySelector("#tripMemo");
  const actionList = document.querySelector("[data-plan-action-list]");
  const addButton = document.querySelector("[data-plan-action-add]");
  const undoButton = document.querySelector("[data-plan-undo]");
  const redoButton = document.querySelector("[data-plan-redo]");
  const publicSelect = document.querySelector("[data-plan-public-select]");
  const publicSelectText = document.querySelector(
    "[data-plan-public-select-text]",
  );

  if (
    !(titleInput instanceof HTMLInputElement) ||
    !(titleEditButton instanceof HTMLButtonElement) ||
    !(memoInput instanceof HTMLTextAreaElement) ||
    !(undoButton instanceof HTMLButtonElement) ||
    !(redoButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  // URL・下書き・新規作成画面から編集開始時のしおり情報を決める。
  const storedPlan = getPlanFromUrl();
  const destinations =
    storedPlan?.destinations || getStoredCreatePlanDestinations();

  const storedBelongings =
    Array.isArray(storedPlan?.belongings) && storedPlan.belongings.length > 0
      ? storedPlan.belongings
      : [];
  const normalizedBelongings = storedBelongings
    .map(normalizeBelongingItem)
    .filter(Boolean);
  let plan = normalizePlan({
    id: storedPlan?.id,
    createdAt: storedPlan?.createdAt,
    title: storedPlan?.title || titleInput.value,
    dateText: storedPlan?.dateText || getStoredCreatePlanDate(),
    isPublic: storedPlan
      ? storedPlan.isPublic === true
      : getStoredCreatePlanPublic(),
    memo: storedPlan?.memo || memoInput.value,
    destinations,
    actions: storedPlan?.actions,
    selectedSpots: storedPlan?.selectedSpots,
    belongings: normalizedBelongings,
  });
  const storedHistory = getStoredPlanHistory(plan.id);
  let undoStack = storedHistory.undoStack;
  let redoStack = storedHistory.redoStack;
  let editingStartPlan = null;
  let lastRenderedDateText = null;
  let dateSelectionStartPlan = null;

  // 新規作成後のリロードでも同じしおりを開けるように URL を固定する。
  const persistPlanUrl = () => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("new") !== "1") {
      return;
    }

    params.delete("new");
    params.set("id", plan.id);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}${window.location.hash}`,
    );
  };

  // Undo/Redo の有無に合わせてボタンの押下可否を更新する。
  const updateHistoryButtons = () => {
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
  };

  // 公開設定の select に現在のしおり状態を反映する。
  const updatePublicSelect = () => {
    if (publicSelect instanceof HTMLSelectElement) {
      publicSelect.value = plan.isPublic ? "1" : "0";
    }

    if (publicSelectText instanceof HTMLElement) {
      publicSelectText.textContent = plan.isPublic ? "公開中" : "非公開中";
    }
  };

  // リロード後も Undo/Redo を復元できるように履歴を保存する。
  const saveHistory = () => {
    setStoredPlanHistory(plan.id, {
      undoStack,
      redoStack,
    });
  };

  // 最新の DOM 状態を取り込んで、下書きと作成済み一覧へ保存する。
  const savePlan = () => {
    const dateText = document.querySelector(".p-plan__kvDateText");

    plan = {
      ...plan,
      dateText:
        dateText instanceof HTMLElement && dateText.textContent
          ? dateText.textContent
          : plan.dateText,
      isPublic:
        publicSelect instanceof HTMLSelectElement
          ? publicSelect.value === "1"
          : plan.isPublic,
      memo: memoInput.value,
      belongings: getBelongingsStateFromDom(),
    };
    setStoredPlan(plan);
    saveCreatedPlan(plan);
  };

  // 日付表示・flatpickr・日別スポット欄を同じ日程へ同期する。
  const syncPlanDateUi = (dateText) => {
    const dateInput = document.querySelector("#date");

    updatePlanSummaryDateText(dateText);
    if (dateInput instanceof HTMLInputElement) {
      dateInput.value = dateText;
      if (dateInput._flatpickr) {
        dateInput._flatpickr.setDate(
          dateText.split(" 〜 ").filter(Boolean),
          false,
        );
      }
    }
    if (lastRenderedDateText !== dateText) {
      renderPlanDateList(dateText);
      lastRenderedDateText = dateText;
    }
  };

  // スポット候補モジュールへ選択済みスポットの再描画を依頼する。
  const renderSelectedSpots = () => {
    document.dispatchEvent(
      new CustomEvent("tripCompassPlanSelectedSpotsRender", {
        detail: {
          selectedSpots: clonePlan(plan.selectedSpots),
        },
      }),
    );
  };

  const renderPlanMoney = () => {
    renderPlanMoneyList(plan.selectedSpots, plan.dateText);
  };

  // 現在の plan 状態を編集画面全体へ反映する。
  const render = () => {
    titleInput.value = plan.title;
    memoInput.value = plan.memo;
    updatePublicSelect();
    syncPlanDateUi(plan.dateText);
    if (actionList instanceof HTMLElement) {
      actionList.textContent = "";
      plan.actions.forEach((action, index) => {
        actionList.appendChild(createActionElement(action, index));
      });
    }
    applyBelongingsStateToDom(plan.belongings);
    renderSelectedSpots();
    renderPlanMoney();
    savePlan();
    updateHistoryButtons();
  };

  // 変更前のしおりを Undo 履歴へ積み、Redo 履歴をリセットする。
  const pushUndo = (previousPlan) => {
    if (isSamePlan(previousPlan, plan)) {
      return;
    }

    undoStack = [...undoStack, clonePlan(previousPlan)];
    redoStack = [];
    saveHistory();
    updateHistoryButtons();
  };

  // 行動予定の単一フィールドだけを更新する。
  const updateAction = (id, field, value) => {
    plan = {
      ...plan,
      actions: plan.actions.map((action) => {
        if (action.id !== id) {
          return action;
        }

        return {
          ...action,
          [field]: value,
        };
      }),
    };
    savePlan();
  };

  // 他モジュールからの要求に応じて、選択済みスポットを再送する。
  document.addEventListener("tripCompassPlanSelectedSpotsRequest", () => {
    renderSelectedSpots();
  });

  // スポットの追加・削除・編集結果をしおり状態へ反映する。
  document.addEventListener("tripCompassPlanSelectedSpotsChange", (event) => {
    const selectedSpots =
      event instanceof CustomEvent && Array.isArray(event.detail?.selectedSpots)
        ? event.detail.selectedSpots
        : null;

    if (!selectedSpots) {
      return;
    }

    const previousPlan = clonePlan(plan);
    plan = {
      ...plan,
      selectedSpots: selectedSpots.map(normalizeSelectedSpot).filter(Boolean),
    };
    pushUndo(previousPlan);
    renderPlanMoney();
    savePlan();
  });

  // 日付ピッカー側の変更をしおり状態と日別スポット欄へ反映する。
  document.addEventListener("tripCompassPlanDateChange", (event) => {
    const dateText =
      event instanceof CustomEvent && typeof event.detail?.dateText === "string"
        ? event.detail.dateText
        : "";
    const isRangeSelectionInProgress =
      event instanceof CustomEvent &&
      event.detail?.isRangeSelectionInProgress === true;
    const basePlan =
      dateSelectionStartPlan ||
      (isRangeSelectionInProgress ? clonePlan(plan) : null);
    const previousPlan = clonePlan(basePlan || plan);

    if (isRangeSelectionInProgress && !dateSelectionStartPlan) {
      dateSelectionStartPlan = clonePlan(plan);
    }

    plan = {
      ...plan,
      dateText,
      selectedSpots: syncSelectedSpotsToDateText(
        (basePlan || plan).selectedSpots,
        (basePlan || plan).dateText,
        dateText,
      ),
    };

    if (!isRangeSelectionInProgress) {
      dateSelectionStartPlan = null;
      pushUndo(previousPlan);
    }

    syncPlanDateUi(plan.dateText);
    renderSelectedSpots();
    renderPlanMoney();
    savePlan();
  });

  // 持ち物のインライン編集結果をしおり状態へ反映する。
  document.addEventListener("tripCompassPlanBelongingsChange", (event) => {
    const previousBelongings =
      event instanceof CustomEvent &&
      Array.isArray(event.detail?.previousBelongings)
        ? event.detail.previousBelongings
        : null;
    const nextBelongings =
      event instanceof CustomEvent &&
      Array.isArray(event.detail?.nextBelongings)
        ? event.detail.nextBelongings
        : null;

    if (!previousBelongings || !nextBelongings) {
      return;
    }

    const previousPlan = {
      ...clonePlan(plan),
      belongings: previousBelongings
        .map(normalizeBelongingItem)
        .filter(Boolean),
    };

    plan = {
      ...plan,
      belongings: nextBelongings.map(normalizeBelongingItem).filter(Boolean),
    };
    pushUndo(previousPlan);
    savePlan();
  });

  // タイトル編集ボタンで入力欄を編集可能にする。
  titleEditButton.addEventListener("click", () => {
    titleInput.readOnly = false;
    titleInput.focus();
    titleInput.select();
  });

  // テキスト編集開始時の状態を保持し、確定時に Undo 履歴へ積む。
  titleInput.addEventListener("focus", () => {
    editingStartPlan = clonePlan(plan);
  });

  titleInput.addEventListener("input", () => {
    plan = {
      ...plan,
      title: titleInput.value,
    };
    savePlan();
  });

  titleInput.addEventListener("change", () => {
    if (!editingStartPlan) {
      return;
    }

    pushUndo(editingStartPlan);
    editingStartPlan = null;
  });

  memoInput.addEventListener("focus", () => {
    editingStartPlan = clonePlan(plan);
  });

  memoInput.addEventListener("input", () => {
    plan = {
      ...plan,
      memo: memoInput.value,
    };
    savePlan();
  });

  memoInput.addEventListener("change", () => {
    if (!editingStartPlan) {
      return;
    }

    pushUndo(editingStartPlan);
    editingStartPlan = null;
  });

  if (publicSelect instanceof HTMLSelectElement) {
    publicSelect.addEventListener("change", () => {
      const previousPlan = clonePlan(plan);

      plan = {
        ...plan,
        isPublic: publicSelect.value === "1",
      };
      updatePublicSelect();
      pushUndo(previousPlan);
      savePlan();
    });
  }

  // 行動予定の入力・削除をイベント委譲でまとめて扱う。
  if (actionList instanceof HTMLElement) {
    actionList.addEventListener("focusin", (event) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.matches("[data-plan-action-field]")
      ) {
        editingStartPlan = clonePlan(plan);
      }
    });

    actionList.addEventListener("input", (event) => {
      const input =
        event.target instanceof HTMLElement
          ? event.target.closest("[data-plan-action-field]")
          : null;
      const item =
        input instanceof HTMLElement
          ? input.closest("[data-plan-action-id]")
          : null;

      if (
        !(
          input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement
        ) ||
        !(item instanceof HTMLElement) ||
        !item.dataset.planActionId ||
        !input.dataset.planActionField
      ) {
        return;
      }

      updateAction(
        item.dataset.planActionId,
        input.dataset.planActionField,
        input.value,
      );
    });

    actionList.addEventListener("change", () => {
      if (!editingStartPlan) {
        return;
      }

      pushUndo(editingStartPlan);
      editingStartPlan = null;
    });

    actionList.addEventListener("click", (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest("[data-plan-action-delete]")
          : null;

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const previousPlan = clonePlan(plan);
      plan = {
        ...plan,
        actions:
          plan.actions.length > 1
            ? plan.actions.filter((action) => {
                return action.id !== button.dataset.planActionDelete;
              })
            : [createAction()],
      };
      pushUndo(previousPlan);
      render();
    });
  }

  // 行動予定を末尾へ追加する。
  if (addButton instanceof HTMLButtonElement) {
    addButton.addEventListener("click", () => {
      const previousPlan = clonePlan(plan);
      plan = {
        ...plan,
        actions: [...plan.actions, createAction()],
      };
      pushUndo(previousPlan);
      render();
    });
  }

  // ひとつ前の状態へ戻す。
  undoButton.addEventListener("click", () => {
    const previousPlan = undoStack.at(-1);

    if (!previousPlan) {
      return;
    }

    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, clonePlan(plan)];
    plan = clonePlan(previousPlan);
    saveHistory();
    render();
  });

  // Undo した状態をもう一度進める。
  redoButton.addEventListener("click", () => {
    const nextPlan = redoStack.at(-1);

    if (!nextPlan) {
      return;
    }

    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, clonePlan(plan)];
    plan = clonePlan(nextPlan);
    saveHistory();
    render();
  });

  persistPlanUrl();
  render();
};

// DOM の準備ができてから各 UI 機能を初期化する。
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupPlanSidebarNavigation();
      setupBelongingsTabs();
      setupBelongingsAddForms();
      setupBelongingsItemEditing();
      setupPlanEditor();
    },
    {
      once: true,
    },
  );
} else {
  setupPlanSidebarNavigation();
  setupBelongingsTabs();
  setupBelongingsAddForms();
  setupBelongingsItemEditing();
  setupPlanEditor();
}
