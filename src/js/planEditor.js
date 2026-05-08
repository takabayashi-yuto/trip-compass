const PLAN_DRAFT_STORAGE_KEY = "tripCompassPlanDraft";
const CREATED_PLANS_STORAGE_KEY = "tripCompassCreatedPlans";
const CREATE_PLAN_DESTINATIONS_STORAGE_KEY =
  "tripCompassCreatePlanDestinations";
const CREATE_PLAN_DATE_STORAGE_KEY = "tripCompassCreatePlanDate";

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

// 保存済み・新規のしおりデータを不足のない編集用データへ整える。
const normalizePlan = (plan) => {
  const actions = Array.isArray(plan?.actions)
    ? plan.actions.map(normalizeAction)
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
    destinations,
    actions: actions.length > 0 ? actions : [createAction()],
  };
};

// 履歴管理用にしおりデータをディープコピーする。
const clonePlan = (plan) => JSON.parse(JSON.stringify(plan));

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
    destinations: plan.destinations,
    actions: plan.actions,
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
const createField = ({ label, value, name, placeholder, multiline = false }) => {
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

  sidebar.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-plan-scroll-target]")
        : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const targetSelector = button.dataset.planScrollTarget;
    const target =
      targetSelector && document.querySelector(targetSelector);

    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
  });
};

// しおり編集画面を初期化し、入力・追加削除・Undo/Redo を管理する。
const setupPlanEditor = () => {
  const titleInput = document.querySelector(".p-plan__kvInput");
  const titleEditButton = document.querySelector("[data-plan-title-edit]");
  const actionList = document.querySelector("[data-plan-action-list]");
  const addButton = document.querySelector("[data-plan-action-add]");
  const undoButton = document.querySelector("[data-plan-undo]");
  const redoButton = document.querySelector("[data-plan-redo]");

  if (
    !(titleInput instanceof HTMLInputElement) ||
    !(titleEditButton instanceof HTMLButtonElement) ||
    !(actionList instanceof HTMLElement) ||
    !(addButton instanceof HTMLButtonElement) ||
    !(undoButton instanceof HTMLButtonElement) ||
    !(redoButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const storedPlan = getPlanFromUrl();
  let plan = normalizePlan({
    id: storedPlan?.id,
    createdAt: storedPlan?.createdAt,
    title: storedPlan?.title || titleInput.value,
    dateText: storedPlan?.dateText || getStoredCreatePlanDate(),
    destinations: storedPlan?.destinations || getStoredCreatePlanDestinations(),
    actions: storedPlan?.actions,
  });
  let undoStack = [];
  let redoStack = [];
  let editingStartPlan = null;

  const updateHistoryButtons = () => {
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
  };

  const savePlan = () => {
    const dateText = document.querySelector(".p-plan__kvDateText");

    plan = {
      ...plan,
      dateText:
        dateText instanceof HTMLElement && dateText.textContent
          ? dateText.textContent
          : plan.dateText,
    };
    setStoredPlan(plan);
    saveCreatedPlan(plan);
  };

  const render = () => {
    const dateText = document.querySelector(".p-plan__kvDateText");
    const dateInput = document.querySelector("#date");

    titleInput.value = plan.title;
    if (dateText instanceof HTMLElement) {
      dateText.textContent = plan.dateText;
    }
    if (dateInput instanceof HTMLInputElement) {
      dateInput.value = plan.dateText;
      if (dateInput._flatpickr) {
        dateInput._flatpickr.setDate(
          plan.dateText.split(" 〜 ").filter(Boolean),
          false,
        );
      }
    }
    actionList.textContent = "";
    plan.actions.forEach((action, index) => {
      actionList.appendChild(createActionElement(action, index));
    });
    savePlan();
    updateHistoryButtons();
  };

  const pushUndo = (previousPlan) => {
    if (isSamePlan(previousPlan, plan)) {
      return;
    }

    undoStack = [...undoStack, clonePlan(previousPlan)];
    redoStack = [];
    updateHistoryButtons();
  };

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

  document.addEventListener("tripCompassPlanDateChange", (event) => {
    const dateText =
      event instanceof CustomEvent && typeof event.detail?.dateText === "string"
        ? event.detail.dateText
        : "";
    const previousPlan = clonePlan(plan);

    plan = {
      ...plan,
      dateText,
    };
    pushUndo(previousPlan);
    savePlan();
  });

  titleEditButton.addEventListener("click", () => {
    titleInput.readOnly = false;
    titleInput.focus();
    titleInput.select();
  });

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

  addButton.addEventListener("click", () => {
    const previousPlan = clonePlan(plan);
    plan = {
      ...plan,
      actions: [...plan.actions, createAction()],
    };
    pushUndo(previousPlan);
    render();
  });

  undoButton.addEventListener("click", () => {
    const previousPlan = undoStack.at(-1);

    if (!previousPlan) {
      return;
    }

    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, clonePlan(plan)];
    plan = clonePlan(previousPlan);
    render();
  });

  redoButton.addEventListener("click", () => {
    const nextPlan = redoStack.at(-1);

    if (!nextPlan) {
      return;
    }

    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, clonePlan(plan)];
    plan = clonePlan(nextPlan);
    render();
  });

  render();
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupPlanSidebarNavigation();
      setupPlanEditor();
    },
    {
      once: true,
    },
  );
} else {
  setupPlanSidebarNavigation();
  setupPlanEditor();
}
