import { diagnosisQuestions } from "./diagnosis-questions.js";
import cities from "../data/cities.json";
import diagnosisFallbackImageUrl from "../assets/diagnosis/diagnosis-img-01.webp?url";

const root = document.querySelector("[data-diagnosis-root]");

const MAX_RESULT_COUNT = 3;
const DIAGNOSIS_STATE_STORAGE_KEY = "tripCompassDiagnosisState";
const DIAGNOSIS_CITY_IMAGE_SUFFIX = "-diagnosis.webp";
const diagnosisCityImageUrls = import.meta.glob(
  "../assets/diagnosis/*-diagnosis.webp",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);
const diagnosisImageIdPattern = /^[a-z0-9-]+$/;
const diagnosisImageIdFallbacks = {
  seoul: ["seaoul"],
};
const cityList = Array.isArray(cities) ? cities : [cities];

export const answerTagMap = {
  destinationType: {
    domestic: ["domestic"],
    international: ["international"],
  },

  priority: {
    food: ["food"],
    "history-culture": ["history", "culture"],
    shopping: ["shopping"],
    relax: ["relax", "nature", "cafe"],
    photo: ["photo", "city", "nature"],
    activity: ["activity", "nature", "city"],
  },

  mood: {
    city: ["city", "shopping", "food"],
    resort: ["resort", "relax", "nature"],
    nature: ["nature", "relax", "activity"],
    "calm-city": ["calm", "cafe", "city"],
    exotic: ["culture", "history", "food"],
  },

  pace: {
    slow: ["relax", "cafe", "calm"],
    balanced: ["food", "city", "culture"],
    active: ["activity", "city", "shopping"],
    free: ["city", "cafe", "food"],
  },

  companion: {
    alone: ["solo", "city", "cafe"],
    friend: ["friend", "food", "shopping", "city"],
    lover: ["couple", "cafe", "photo", "relax"],
    family: ["family", "nature", "relax"],
  },

  duration: {
    "day-trip": ["city", "cafe", "food"],
    "1-night-2-days": ["city", "food", "shopping"],
    "2-nights-3-days": ["food", "shopping", "culture"],
    "3-nights-4-days": ["city", "culture", "nature"],
    "4-nights-or-more": ["culture", "nature", "activity", "resort"],
  },

  budget: {
    budget: ["budget", "food", "cafe"],
    standard: ["standard", "food", "city"],
    premium: ["premium", "shopping", "cafe"],
    luxury: ["luxury", "resort", "shopping", "relax"],
  },

  travelTime: {
    short: ["domestic", "city"],
    medium: ["city", "food", "shopping"],
    long: ["international", "culture", "city"],
    "very-long": ["international", "resort", "nature", "culture"],
  },
};
const getCityCandidates = (answers) => {
  const destinationType = answers.get("destinationType");

  if (destinationType === "domestic") {
    return cityList.filter((city) => city.country === "日本");
  }

  if (destinationType === "international") {
    return cityList.filter((city) => city.country !== "日本");
  }

  return cityList;
};

const getAnswerTags = (answers) =>
  Array.from(answers.entries()).flatMap(
    ([questionId, value]) => answerTagMap[questionId]?.[value] ?? [],
  );

const getRecommendedCities = (answers) => {
  const answerTags = getAnswerTags(answers);

  return getCityCandidates(answers)
    .map((city) => {
      const score = city.tags.reduce(
        (total, tag) =>
          total + answerTags.filter((answerTag) => answerTag === tag).length,
        0,
      );

      return { ...city, score };
    })
    .sort(
      (current, next) =>
        next.score - current.score ||
        current.name.localeCompare(next.name, "ja"),
    )
    .slice(0, MAX_RESULT_COUNT);
};

const getDiagnosisImageUrl = (city) => {
  if (!diagnosisImageIdPattern.test(city.id)) {
    return "";
  }

  const imageIds = [city.id, ...(diagnosisImageIdFallbacks[city.id] ?? [])];

  for (const imageId of imageIds) {
    const imageFileName = `${imageId}${DIAGNOSIS_CITY_IMAGE_SUFFIX}`;
    const imageModulePath = `../assets/diagnosis/${imageFileName}`;

    if (diagnosisCityImageUrls[imageModulePath]) {
      return diagnosisCityImageUrls[imageModulePath];
    }
  }

  return diagnosisFallbackImageUrl;
};

const getCreateUrl = (city) =>
  `/create?destination=${encodeURIComponent(city.id)}`;

const getQuestionById = (questionId) =>
  diagnosisQuestions.find((question) => question.id === questionId);

const isValidAnswer = (questionId, value) => {
  const question = getQuestionById(questionId);

  return (
    typeof value === "string" &&
    question?.options.some((option) => option.value === value)
  );
};

const areAllQuestionsAnswered = (answers) =>
  diagnosisQuestions.every((question) => answers.has(question.id));

const getStoredDiagnosisState = () => {
  try {
    const storedState = JSON.parse(
      sessionStorage.getItem(DIAGNOSIS_STATE_STORAGE_KEY) || "{}",
    );

    const storedAnswers = Array.isArray(storedState.answers)
      ? storedState.answers.filter(([questionId, value]) =>
          isValidAnswer(questionId, value),
        )
      : [];
    const answers = new Map(storedAnswers);
    const storedQuestionIndex = Number.isInteger(
      storedState.currentQuestionIndex,
    )
      ? storedState.currentQuestionIndex
      : 0;
    const currentQuestionIndex = Math.min(
      Math.max(storedQuestionIndex, 0),
      diagnosisQuestions.length - 1,
    );
    const isResultShown =
      storedState.isResultShown === true && areAllQuestionsAnswered(answers);

    return {
      answers,
      currentQuestionIndex,
      isResultShown,
    };
  } catch {
    return {
      answers: new Map(),
      currentQuestionIndex: 0,
      isResultShown: false,
    };
  }
};

if (root) {
  const storedDiagnosisState = getStoredDiagnosisState();
  let currentQuestionIndex = storedDiagnosisState.currentQuestionIndex;
  let isResultShown = storedDiagnosisState.isResultShown;
  const answers = new Map(storedDiagnosisState.answers);

  const saveDiagnosisState = () => {
    try {
      sessionStorage.setItem(
        DIAGNOSIS_STATE_STORAGE_KEY,
        JSON.stringify({
          answers: Array.from(answers.entries()),
          currentQuestionIndex,
          isResultShown,
        }),
      );
    } catch {
      return;
    }
  };

  const clearDiagnosisState = () => {
    try {
      sessionStorage.removeItem(DIAGNOSIS_STATE_STORAGE_KEY);
    } catch {
      return;
    }
  };

  const renderQuestion = () => {
    const question = diagnosisQuestions[currentQuestionIndex];
    const selectedValue = answers.get(question.id);
    const isLastQuestion =
      currentQuestionIndex === diagnosisQuestions.length - 1;

    root.innerHTML = `
      <section class="p-question__section l-section">
        <div class="l-inner">
          <div class="p-question__panel">
            <div class="p-question__titleList">
              <p class="p-question__progress">
                Q${currentQuestionIndex + 1}
              </p>
              <h2 class="c-title p-question__title">${question.question}</h2>
            </div>
            <div class="p-question__options" role="radiogroup" aria-label="${question.question}">
              ${question.options
                .map(
                  (option) => `
                    <button
                      class="p-question__option${selectedValue === option.value ? " is-selected" : ""}"
                      type="button"
                      role="radio"
                      aria-checked="${selectedValue === option.value}"
                      data-option-value="${option.value}"
                    >
                      ${option.label}
                    </button>
                  `,
                )
                .join("")}
            </div>
            <div class="p-question__actions">
              <button class="p-question__back" type="button" data-back ${currentQuestionIndex === 0 ? "disabled" : ""}>
                戻る
              </button>
              <button class="c-button p-question__next" type="button" data-next ${selectedValue ? "" : "disabled"}>
                <span class="c-button__text">${isLastQuestion ? "結果を見る" : "次へ"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  };

  const renderResult = () => {
    const recommendedCities = getRecommendedCities(answers);

    root.innerHTML = `
      <section class="p-question__section l-section">
        <div class="l-inner">
          <div class="p-question__panel">
            <h2 class="c-title p-question__title">あなたにおすすめの旅先は‥‥</h2>
            <ul class="p-question__resultList">
              ${recommendedCities
                .map(
                  (city) => `
                    <li class="p-question__resultItem">
                      <div class="p-question__resultGrid">
                        <div class="p-question__resultSubItem p-question__resultImageBox">
                          <img
                            src="${getDiagnosisImageUrl(city)}"
                            alt="${city.name}のイメージ"
                            class="p-question__resultImage"
                          >
                        </div>
                        <div class="p-question__resultSubItem">
                          <p class="p-question__resultArea">${city.country} / ${city.area}</p>
                          <h3 class="p-question__resultCity">${city.name}</h3>
                          <div class="p-question__resultSubItem p-question__resultAction">
                            <a href="${getCreateUrl(city)}" class="c-button p-question__resultButton">
                              <span class="c-button__text">しおりを作成する</span>
                              <span class="c-button__icon u-note"></span>
                            </a>
                          </div>
                        </div>
                        <div class="p-question__resultSubItem">
                          <p class="p-question__resultText">
                            ${city.explain}
                          </p>
                        </div>
                      </div>
                    </li>
                  `,
                )
                .join("")}
            </ul>
            <button class="c-button p-question__restart" type="button" data-restart>
              <span class="c-button__text">もう一度診断する</span>
              <span class="c-button__icon u-replay"></span>
            </button>
          </div>
        </div>
      </section>
    `;
  };

  root.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const optionButton = target.closest("[data-option-value]");

    if (optionButton instanceof HTMLElement) {
      const question = diagnosisQuestions[currentQuestionIndex];
      answers.set(question.id, optionButton.dataset.optionValue);
      isResultShown = false;
      saveDiagnosisState();
      renderQuestion();
      return;
    }

    if (target.closest("[data-back]")) {
      currentQuestionIndex = Math.max(0, currentQuestionIndex - 1);
      isResultShown = false;
      saveDiagnosisState();
      renderQuestion();
      return;
    }

    if (target.closest("[data-next]")) {
      const isLastQuestion =
        currentQuestionIndex === diagnosisQuestions.length - 1;

      if (isLastQuestion) {
        isResultShown = true;
        saveDiagnosisState();
        renderResult();
        return;
      }

      currentQuestionIndex += 1;
      isResultShown = false;
      saveDiagnosisState();
      renderQuestion();
      return;
    }

    if (target.closest("[data-restart]")) {
      currentQuestionIndex = 0;
      isResultShown = false;
      answers.clear();
      clearDiagnosisState();
      renderQuestion();
    }
  });

  if (isResultShown) {
    renderResult();
  } else {
    renderQuestion();
  }
}
