**言語 / Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# 夢間 / Yumema

[![Release](https://img.shields.io/badge/release-v0.1.1-blue)](https://github.com/sixtdreanight/ai-companion/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)]()

> 夢と現実の狭間で、彼女はいつもそばにいる — AIコンパニオンデスクトップアプリ

**現在のバージョン：v0.1.1**

夢間（Yumema）はAIコンパニオンデスクトップアプリケーションです。彼女は独自の性格、趣味、感情、記憶を持ち、QQ、WeChat、またはアプリ内で直接チャットできます。ダブルクリックでインストールし、ウィザードに従って設定すれば、すぐに使い始められます。

---

## 機能

- **デスクトップアプリ** — macOS / Windows / Linux、ダブルクリックインストール、自動更新対応
- **ガイド付きセットアップ** — 14ステップのウィザード、2分で設定完了
- **直接チャット** — アプリ内チャット、インスタントメッセージ形式のバブル
- **QQボット** — QQグループ/個人チャット対応、QRコードでログイン
- **WeChatボット** — WeChat個人/グループチャット対応、アプリ内でDockerサービスをワンクリック起動
- **完全な性格** — 年齢、職業、趣味、感情、意見を持つ、まるで本物の人間のように
- **時間認識** — 朝晩、週末、祝日を把握し、自発的に挨拶
- **記憶システム** — よく話すことは覚え、あまり話題にならないことは徐々に忘れる
- **関係育成** — 最初から恋人 / 見知らぬ人から徐々に育成
- **安全フィルター** — センシティブな内容をフィルタリング、プライバシー保護
- **テストフィードバック** — 内蔵アンケートで製品の継続的改善を支援

---

## バージョン状況

**v0.1.1** — 現在はベータ版です。機能は継続的に改善されています。ご利用後は内蔵アンケートからフィードバックをお寄せください。

---

## クイックスタート

### ダウンロードとインストール

[Releases](https://github.com/sixtdreanight/ai-companion/releases) から対応プラットフォームのインストールパッケージをダウンロードしてください：

- **macOS**: `.dmg` インストールイメージ (Apple Silicon / Intel)
- **Windows**: `.exe` NSIS インストーラー (x64 / ARM64)
- **Linux**: `.AppImage` 実行ファイル (x64)

### ソースコードから実行

```bash
# 前提条件：Node.js 18+
git clone https://github.com/sixtdreanight/ai-companion.git
cd Yumema
npm install

# 開発モード
npm run dev

# CLI モード（ターミナルチャット）
npm start --terminal

# CLI セットアップウィザード
npm run setup
```

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| デスクトップフレームワーク | Electron 41 |
| ビルドツール | electron-vite 5 |
| フロントエンド | React 19 + TypeScript + Tailwind CSS 4 |
| UIコンポーネント | shadcn/ui + Radix UI + lucide-react |
| AIエンジン | Vercel AI SDK (Claude / GPT / DeepSeek) |
| QQアダプター | NapCatQQ (OneBot v11) |
| WeChatアダプター | Gewechat HTTP API |
| 自動更新 | electron-updater + GitHub Releases |
| パッケージング | electron-builder (macOS/Windows/Linux デュアルアーキテクチャ) |

---

## ディレクトリ構造

```
yumema/
├── src/
│   ├── core/           # 純粋なロジック（CLI/GUI共通）
│   │   ├── config.ts       # 設定管理（AI / QQ / WeChat）
│   │   ├── pipeline.ts     # メッセージ処理パイプライン
│   │   ├── girlfriend.ts   # 人格エンジン
│   │   ├── relationship.ts # 関係管理
│   │   ├── memory.ts       # 記憶システム
│   │   ├── safety.ts       # 安全フィルター
│   │   ├── search.ts       # インターネット検索
│   │   ├── scheduler.ts    # スケジュールタスク
│   │   └── utils.ts        # ユーティリティ関数
│   ├── adapters/
│   │   ├── onebot.ts       # QQ WebSocket アダプター
│   │   └── wechat.ts       # WeChat HTTP API アダプター
│   ├── cli/             # CLI エントリーポイント
│   │   ├── index.ts        # ターミナル / QQ / WeChat チャット
│   │   └── setup.ts        # CLI セットアップウィザード
│   ├── main/            # Electron メインプロセス
│   │   ├── index.ts        # ウィンドウ管理 + 自動更新
│   │   ├── preload.ts      # contextBridge API
│   │   ├── ipc-handlers.ts # IPC チャンネル実装
│   │   ├── napcat-manager.ts # NapCatQQ 管理
│   │   └── wechat-manager.ts # Gewechat Docker 管理
│   └── renderer/        # React レンダラープロセス
│       ├── App.tsx         # HashRouter ルーティング
│       ├── pages/          # SetupWizard / ChatWindow / NapCatSetup
│       ├── components/     # wizard/ chat/ shared/
│       │   ├── ui/         # shadcn/ui コンポーネント (Button/Badge/Card/Dialog/Select/Slider/Sheet/Tabs)
│       │   ├── wizard/     # 14のセットアップウィザードステップ
│       │   ├── chat/       # MessageBubble / MessageList / MessageInput
│       │   └── shared/     # SettingsDialog / UpdateToast / SurveyDialog / ErrorBoundary / CardSelect
│       ├── hooks/          # useSetupWizard / useChat
│       ├── lib/            # cn() ユーティリティ関数
│       └── styles/         # globals.css (デザイントークン)
├── data/                # 実行時データ（会話記録、設定）
├── dist/                # ビルド出力
├── docs/                # プロジェクトドキュメント
└── resources/           # アプリアイコン
```

---

## WeChat 連携（オプション）

夢間ではWeChatを介してAIパートナーとチャットすることができます。[Gewechat](https://github.com/Devo919/Gewechat) サービスをベースとしています：

- **アプリ内ワンクリック起動**：セットアップウィザードまたは設定ページで「Gewechatを起動」をクリックすると、アプリが自動的にDocker環境をチェックしてコンテナを起動します
- **事前に [Docker](https://www.docker.com/) のインストールが必要です**

手動でデプロイする場合：

```bash
docker run -itd -p 2531:2531 -p 2532:2532 --name=gewe gewe
```

WeChatとQQは同時に設定可能で、いつでも設定で有効/無効を切り替えられます。

---

## ドキュメント

- [よくある質問](docs/faq.md) — QQのQRコードログイン、APIキー、NapCatQQ
- [変更履歴](docs/CHANGELOG.md) — バージョン変更記録
- [ロードマップ](docs/ROADMAP.md) — バージョン計画とスケジュール

---

## 重要な注意事項

- **AIの内容は作者の立場を代表するものではありません**。本ソフトウェアは学習・娯楽目的のみです
- **QQはサードパーティプロトコルを使用しています**。アカウント停止のリスクがあるため、サブアカウントの使用をお勧めします
- **AI APIは従量課金制です**。頻繁なチャットは費用が発生します
- **彼女は実際の人間関係を代替できません**。現実世界での社交を大切にしてください
- **プライバシーを保護してください**。身分証明書、銀行カード番号などの機密情報を共有しないでください

## 関連プロジェクト

- [companion-engine](https://github.com/sixtdreanight/companion-engine) — 本アプリケーションを動かすコアエンジン

## License

[GPL-3.0](LICENSE)

---

<div align="center">

**Language / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
