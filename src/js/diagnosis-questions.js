export const diagnosisQuestions = [
  {
    id: "destinationType",
    question: "国内・海外どちらに行きたいですか？",
    options: [
      { label: "国内旅行", value: "domestic" },
      { label: "海外旅行", value: "international" },
    ],
  },
  {
    id: "priority",
    question: "今回の旅で一番重視したいことは？",
    options: [
      { label: "グルメ", value: "food" },
      { label: "歴史・文化", value: "history-culture" },
      { label: "買い物", value: "shopping" },
      { label: "リラックス", value: "relax" },
      { label: "写真映え", value: "photo" },
      { label: "アクティビティ", value: "activity" },
    ],
  },
  {
    id: "mood",
    question: "どんな雰囲気の旅が好きですか？",
    options: [
      { label: "にぎやかな都会", value: "city" },
      { label: "海やリゾート感", value: "resort" },
      { label: "自然が多い場所", value: "nature" },
      { label: "落ち着いた街", value: "calm-city" },
      { label: "異国感・非日常感", value: "exotic" },
    ],
  },
  {
    id: "pace",
    question: "旅のペースはどれに近いですか？",
    options: [
      { label: "のんびり過ごしたい", value: "slow" },
      { label: "ほどよく観光したい", value: "balanced" },
      { label: "朝から夜まで動きたい", value: "active" },
      { label: "予定を決めすぎず自由に動きたい", value: "free" },
    ],
  },
  {
    id: "companion",
    question: "誰と旅行に行きますか？",
    options: [
      { label: "一人旅", value: "alone" },
      { label: "友人", value: "friend" },
      { label: "恋人・夫婦", value: "lover" },
      { label: "家族・子供連れ", value: "family" },
    ],
  },
  {
    id: "duration",
    question: "旅行日数は？",
    options: [
      { label: "日帰り", value: "day-trip" },
      { label: "1泊2日", value: "1-night-2-days" },
      { label: "2泊3日", value: "2-nights-3-days" },
      { label: "3泊4日", value: "3-nights-4-days" },
      { label: "4泊以上", value: "4-nights-or-more" },
    ],
  },
  {
    id: "budget",
    question: "旅行の予算感は？",
    options: [
      { label: "できるだけ安く行きたい", value: "budget" },
      { label: "標準的な予算で楽しみたい", value: "standard" },
      { label: "少し贅沢したい", value: "premium" },
      { label: "予算はあまり気にしない", value: "luxury" },
    ],
  },
  {
    id: "travelTime",
    question: "片道の移動時間はどれくらいまでOKですか？",
    options: [
      { label: "1〜2時間くらい", value: "short" },
      { label: "3〜5時間くらい", value: "medium" },
      { label: "6〜9時間くらい", value: "long" },
      { label: "10時間以上でもOK", value: "very-long" },
    ],
  },
];
