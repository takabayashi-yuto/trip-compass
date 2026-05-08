import { destinationCatalog } from "../js/destinationCatalog.js";

// 旅行先名の検索に使う読み・英字表記の別名一覧。
const destinationAliases = {
  kyoto: ["きょうと", "kyoto"],
  sapporo: ["さっぽろ", "sapporo"],
  hakone: ["はこね", "hakone"],
  okinawa: ["おきなわ", "おきなわほんとう", "okinawa"],
  fukuoka: ["ふくおか", "fukuoka"],
  kanazawa: ["かなざわ", "kanazawa"],
  ishigaki: ["いしがき", "いしがきじま", "ishigaki"],
  seoul: ["そうる", "seoul"],
  busan: ["ぷさん", "busan", "pusan"],
  taipei: ["たいぺい", "taipei"],
  kaohsiung: ["かおしゅん", "たかお", "kaohsiung"],
  jeju: ["ちぇじゅ", "さいしゅうとう", "jeju"],
};

function toHiragana(value) {
  return value.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

// 入力値を検索しやすいように小文字化し、カタカナをひらがなへ寄せる。
export function normalizeDestinationQuery(value) {
  return toHiragana(value.trim().toLowerCase());
}

// マスターデータから、名称・ID・別名をまとめた検索用インデックスを作る。
function createDestinationSearchIndex() {
  return destinationCatalog.map((destination, index) => {
    const aliases = destinationAliases[destination.id] ?? [];
    const terms = new Set([
      destination.name,
      normalizeDestinationQuery(destination.name),
      destination.id,
      ...aliases.map(normalizeDestinationQuery),
    ]);

    return {
      destination,
      index,
      terms: [...terms],
    };
  });
}

const destinationSearchIndex = createDestinationSearchIndex();

// 完全一致と前方一致を優先するためのスコアを返す。
function getMatchScore(query, term) {
  if (!query) {
    return -1;
  }

  if (term === query) {
    return 1000;
  }

  if (term.startsWith(query)) {
    return 700 - term.length;
  }

  return -1;
}

// 入力文字列に一致する旅行先候補をスコア順で返す。
export function findDestinationSuggestions(query, limit = 5) {
  const normalizedQuery = normalizeDestinationQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  return destinationSearchIndex
    .map((entry) => {
      const score = entry.terms.reduce((bestScore, term) => {
        return Math.max(bestScore, getMatchScore(normalizedQuery, term));
      }, -1);

      return {
        ...entry.destination,
        score,
        sortIndex: entry.index,
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.sortIndex - right.sortIndex;
    })
    .slice(0, limit);
}
