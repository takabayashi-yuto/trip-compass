# Trip Compass

Trip Compass は、旅行先診断と旅行しおり作成を行うフロントエンドアプリです。

質問への回答からおすすめの旅行先を提案し、行き先と日程を選んで旅行しおりを作成できます。作成画面では行動予定、候補スポット、持ち物、費用などを編集できる構成です。

## 主な機能

- 旅行先診断
  - 回答内容に応じて国内・海外の旅行先をおすすめ表示
  - 診断結果からしおり作成画面へ遷移
  - 診断途中の状態を `sessionStorage` に保存
- しおり作成
  - 行き先候補の検索・選択
  - 日程選択
  - 公開設定
  - 作成内容をブラウザストレージに保存
- しおり編集
  - 行動予定の追加・編集
  - スポット候補の追加
  - 持ち物リスト
  - 費用メモ
- 認証画面
  - 新規登録画面
  - ログイン画面

## 使用技術

- Vite
- Sass
- JavaScript
- flatpickr
- Supabase Auth

## セットアップ

```bash
npm install
```

Supabase Auth を使用するため、`.env.example` を参考に `.env.local` を作成してください。

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Supabase 側では Authentication の Email provider を有効にし、必要に応じて Site URL と Redirect URLs に開発環境のURLを登録してください。

## 開発サーバー

```bash
npm run dev
```

Vite の開発サーバーが起動します。表示されたローカルURLをブラウザで開いて確認してください。

## CSSビルド

SCSSから `style.css` を生成します。

```bash
npm run build:css
```

開発中にSCSSの変更を監視する場合は次のコマンドを使用します。

```bash
npm run watch:css
```

## 本番ビルド

```bash
npm run build
```

`prebuild` により、本番ビルド前にCSSビルドも実行されます。

ビルド結果をローカルで確認する場合は次のコマンドを使用します。

```bash
npm run preview
```

## ページ構成

- `index.html`: トップページ
- `auth.html`: 新規登録ページ
- `login.html`: ログインページ
- `create.html`: しおり作成ページ
- `create/plan.html`: しおり編集ページ
- `diagnosis.html`: 旅行先診断の導入ページ
- `diagnosis/question.html`: 診断質問ページ

Vite の本番ビルド対象は `vite.config.js` で定義されています。

## ディレクトリ構成

```text
.
├── index.html
├── auth.html
├── login.html
├── create.html
├── create/
│   └── plan.html
├── diagnosis.html
├── diagnosis/
│   └── question.html
├── public/
├── src/
│   ├── assets/
│   ├── data/
│   ├── js/
│   ├── main.js
│   └── scss/
├── style.css
├── package.json
└── vite.config.js
```

## 開発メモ

- アプリ全体のエントリーポイントは `src/main.js` です。
- スタイルは `src/scss/style.scss` を起点に管理し、生成されたCSSは `style.css` に出力します。
- 旅行先データは `src/data/cities.json` と `src/js/destinationCatalog.js` で管理されています。
- 診断の質問データは `src/data/diagnosis-questions.json` と `src/js/diagnosis-questions.js` で管理されています。
- しおり作成・編集の状態は主にブラウザの `localStorage` を使用します。
