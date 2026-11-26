# 🐈‍⬛ KuroCat — 無料オープンソース・デスクトップタイピング黒猫ペット

<p align="center">
  <a href="./README.md">🇨🇳 简体中文</a> &nbsp;|&nbsp;
  <a href="./README.en.md">🇺🇸 English</a> &nbsp;|&nbsp;
  <strong>🇯🇵 日本語</strong>
</p>

<p align="center">
  <a href="https://qianyi.one/kurocat/?lang=ja"><img src="https://img.shields.io/badge/Website-qianyi.one%2Fkurocat-d4f044?style=flat-square&logo=googlechrome&logoColor=111" alt="KuroCat Official Website" /></a>
  <a href="https://github.com/qianyiai/kurocat/releases/latest"><img src="https://img.shields.io/github/v/release/qianyiai/kurocat?style=flat-square&color=38bdf8" alt="Latest Release" /></a>
  <a href="https://github.com/qianyiai/kurocat/blob/main/LICENSE"><img src="https://img.shields.io/github/license/qianyiai/kurocat?style=flat-square&color=22c55e" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Platform-Win11%2F10%2F7%20%7C%20macOS%20%7C%20Linux%20%7C%20Android-818cf8?style=flat-square" alt="Cross Platform" />
</p>

> 🌐 **公式サイト・ブラウザ体験版・高速ダウンロード**：[**https://qianyi.one/kurocat/**](https://qianyi.one/kurocat/)（[日本語 UI](https://qianyi.one/kurocat/?lang=ja)）

**Windows（Win11/10 & Win7 SP1）/ macOS（10.15+ Apple Silicon & Intel）/ Linux（Ubuntu / Debian / KylinOS / UOS）** 対応の軽量・透過・最前面デスクトップタイピング猫コンパニオンです。**Tauri v2（Rust ネイティブグローバルフック + 内蔵 MCP サーバー + Three.js 3D / HTML5 Canvas 2D デュアルエンジン）** で構築され、外部ランタイム不要・約 24 MB の軽快動作を実現。初期設定の **✨ 3D フィギュアモード** と **🎨 2D クラシック手描き** をワンクリックで切替でき、**手描き猫スキン 6 種 + 🐳 クジラ娘（BigFish）**、**選択式 3D 首輪ベル＆ゲーム自動検出ゲーミングヘッドセット（初期設定はいずれも OFF）**、**パスワード入力時の自動目閉じ・目隠しガード**、**しっぽタイピングの 4 モード＆キー直接指定**、**OBS 透過ブラウザソース内蔵**、さらに **MCP プロトコル対応** で愛猫の写真から AI が一言で専用ペットを作成できます（3D/2D でカスタム模様 `spots[]` を 1:1 同期）。

## 🎬 オンライン体験版 & クジラ娘 14 秒デモ動画

<table>
  <tr>
    <td align="center" width="54%" valign="top">
      <a href="https://qianyi.one/kurocat/?lang=ja" target="_blank" rel="noopener">
        <img src="docs/playground-demo.webp" alt="KuroCat 公式サイト ブラウザリアルタイム体験版（7 スキン・65%/108 キー・パスワード保護）" width="400" />
      </a>
      <br/>
      <strong>🎮 <a href="https://qianyi.one/kurocat/?lang=ja">公式サイトで今すぐブラウザ体験（キーボード入力＆なでなで対応）→</a></strong>
      <br/>
      <sub>3D/2D 切替 · 3D 首輪＆ヘッドセット · 360° 回転 · 猫 6 種 + 🐳 クジラ娘 · 65%/108 キー · 視点切替 · しっぽキー選択 · パスワード保護 · 20%–150% 拡大縮小</sub>
    </td>
    <td align="center" width="46%" valign="top">
      <a href="https://qianyi.one/kurocat/?lang=ja#whale-demo" target="_blank" rel="noopener">
        <img src="docs/whale-demo.webp" alt="KuroCat 🐳 クジラ娘（BigFish）14 秒デモ動画" width="272" />
      </a>
      <br/>
      <strong>🐳 <a href="https://qianyi.one/kurocat/?lang=ja#whale-demo">1080×1920 60fps 音声付きデモ動画を再生 →</a></strong>
      <br/>
      <sub>
        マウス + 手打ち + クジラ尾の 3 系統同時動作 → 高速打鍵で照れ＆笑顔 → パスワード目隠し<br/>
        📥 <a href="https://qianyi.one/kurocat/media/whale-douyin-14s.mp4">MP4 高速ミラー</a> · <a href="https://github.com/qianyiai/kurocat/releases/download/v4.7.0/KuroCat-whale-demo-14s.mp4">GitHub オリジナル</a>
      </sub>
    </td>
  </tr>
</table>

## 📥 ダウンロード（Windows / Win7 / macOS / Linux）

[Releases](https://github.com/qianyiai/kurocat/releases) または以下の最新 **`v5.1.2`** パッケージから直接入手できます（**🤖 AI コンパニオンリアルタイム連携（Doubao Work / WorkBuddy / DeepSeek Harness / Codex / Qwen / Antigravity / Claude Code 対応・作業中の自動タイピング＆承認待ち/エラー/完了アラート）**、**MCP 2D/3D 顔・耳シェイプ自由カスタム（10 ツール＋16 スポット）**、**2D/3D 切替＆WebGL 自動復旧**、**多重起動防止・Win11 更新ロック修正・macOS スリープ復帰/ドラッグ＆Linux スケール修正**に加え、**✨ 3D / 🎨 2D デュアルエンジン**、**5 言語 UI**、**OBS 透過ソース**、**パスワード保護** を搭載）：

- **🪟 Windows 10 / 11（65% インストーラー版 · `v5.1.2`）**：[**`KuroCat-5.1.2-x64-setup.exe`**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-5.1.2-x64-setup.exe)（2.15 MB）｜[**高速ミラー**](https://qianyi.one/kurocat/?lang=ja#download)
  - 初期設定は 65% コンパクト配列。デスクトップアイコン・スタートメニューを自動作成し、右クリックやトレイから **108 フルサイズ（テンキー付）**・**🐳 クジラ娘**・**OBS 透過ソース**・**更新確認** へいつでも切替可能。
  - **よくある質問**：
    - **Edge / Chrome のダウンロード警告・SmartScreen について**：商用コード署名なしの無料オープンソースのため警告が出ることがあります。
      - **Edge**：ダウンロード項目にカーソルを合わせ **`···`** → **保存** → 削除ボタン横の **`▾`（詳細表示）** → **保持する** を選択。
      - **Chrome**：`Ctrl + J` でダウンロード履歴を開き **危険なファイルを保存** → **保持** を選択。
      - **青い SmartScreen 画面**：**詳細情報** → **実行** をクリック。
    - 古い Win10 / LTSC 環境で `WebView2 Runtime` 不足が表示される場合は、Microsoft 公式 1.8 MB ブートストラップを管理者権限で実行してください：[`MicrosoftEdgeWebview2Setup.exe`](https://go.microsoft.com/fwlink/p/?LinkId=2124703)。
    - **フルスクリーンゲーム / 管理者権限 / OBS 配信**：ボーダレス・FSO ゲーム向けにフォーカスを奪わない最前面ガードを内蔵（**マウス透過ロック**＋`Alt` 一時解除がおすすめ）。管理者権限で動くゲームはトレイから **管理者として再起動** を利用してください。OBS 配信は右クリック → **OBS 透過ソース URL をコピー**（`http://127.0.0.1:27421/obs`・透過チャンネル標準対応・デスクトップ非表示の「OBS のみ表示」対応）。カーネル型アンチチート搭載ゲーム（VALORANT 等）ではトレイの **監視を一時停止して非表示** を推奨します。
- **🖥️ Windows 7 SP1（64bit 専用ポータブル版 · `v5.1.2`）**：[**`KuroCat-v5.1.2-win7-x64-portable.zip`**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-win7-x64-portable.zip)（178.94 MB）｜[**高速ミラー**](https://qianyi.one/kurocat/releases/v5.1.2/KuroCat-v5.1.2-win7-x64-portable.zip)
  - ネイティブ PE 6.01 ビルド。Win7 最終対応オフライン **WebView2 109.0.1518.78** を同梱し、Aero ON/OFF を問わず白枠・ギザギザゼロの **256 段階ピクセル透過（`UpdateLayeredWindow`）** に対応。すべて展開し `KuroCat.exe` と `WebView2Runtime` を同フォルダに置いて起動してください。
- **🍎 macOS 10.15 Catalina+（Apple Silicon M1–M4 & Intel ユニバーサル · `v5.1.2`）**：[**`KuroCat-v5.1.2-macos-universal.dmg`**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-macos-universal.dmg)（5.93 MB）｜[**高速ミラー**](https://qianyi.one/kurocat/releases/v5.1.2/KuroCat-v5.1.2-macos-universal.dmg)
  - **🍺 Homebrew でワンライン導入（推奨）**：`brew install --cask qianyiai/tap/kurocat`（`brew upgrade --cask kurocat` で更新可能・検疫属性も自動解除）。
  - `.dmg` を開き `KuroCat.app` を「アプリケーション」フォルダへドラッグして起動。3D/2D 切替・65%/108 キー・全 7 スキン内蔵。
  - **初回起動時（未公証オープンソース）**：「開発元を確認できない」「破損しています」と表示された場合は、ターミナルで一度だけ `xattr -cr /Applications/KuroCat.app` を実行してください（次回以降のアプリ内自動更新では不要）。
  - **キー・マウス監視権限**：「システム設定 → プライバシーとセキュリティ」で **アクセシビリティ** と **入力監視** の両方に `KuroCat` を許可してください（Karabiner-Elements 併用対応）。
  - **macOS Stdio MCP パス**：`/Applications/KuroCat.app/Contents/MacOS/KuroCat`（引数 `--mcp`）、または起動中に `http://127.0.0.1:27420/mcp` へ接続。
- **🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+ / UOS（`v5.1.2`）**：
  - **x86_64**：[**`.deb`（2.38 MB）**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-amd64.deb) · [**`.AppImage`（77.52 MB）**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-amd64.AppImage)
  - **ARM64**：[**`.deb`（2.34 MB）**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-arm64.deb) · [**`.AppImage`（75.69 MB）**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-arm64.AppImage)
  - **動作要件**：Tauri v2 / Ubuntu 22.04 ベースでビルドされており、**`glibc >= 2.34`** が必要です（`.deb` 版は **`libwebkit2gtk-4.1-0`** と **`libayatana-appindicator3-1`** に依存。Ubuntu 20.04 / `glibc 2.31` ベースの KylinOS V10 SP1 には非対応）。
  - X11 `XRecord` を動的ロードして root 権限なしでキー・マウスを取得（Wayland では `evdev` へ自動フォールバック）。ミラーは [`https://qianyi.one/kurocat/?lang=ja#linux-download`](https://qianyi.one/kurocat/?lang=ja#linux-download)。

## ✨ 主な機能

<table>
  <tr>
    <td align="center" width="50%">
      <img src="website/public/assets/showcase-108key.webp" alt="65% コンパクト / 108 フルサイズ × 猫目線 / 視聴者目線" />
      <br/><sub>65% コンパクト / 108 フルサイズ × 猫目線 / 視聴者目線</sub>
    </td>
    <td align="center" width="50%">
      <img src="website/public/assets/showcase-mouse.webp" alt="マウス左右クリック独立ハイライト + アプリ内自動更新" />
      <br/><sub>マウス左右ボタン独立ハイライト + アプリ内自動更新</sub>
    </td>
  </tr>
</table>

- **✨ 3D フィギュア & 🎨 2D クラシックのデュアルエンジン + 選択式アクセサリー**：
  - 初期設定は Three.js によるやわらかな質感の **3D フィギュアモード**。右クリックメニューやトレイからいつでもワンクリックで **2D クラシック手描きモード** へ切り替えられます。
  - **選択式 3D 首輪ベル & ゲーミングヘッドセット（初期設定はいずれも OFF）**：赤・青・ピンク・緑の 4 色から選べる首輪ベル、PC ゲーム起動を自動検知して静かに着脱するゲーミングヘッドセットを搭載。
- **標準 7 スキン（猫 6 種 + 🐳 クジラ娘）+ MCP で無限カスタマイズ**：
  - **🐈‍⬛ 黒猫** / **🐱 ラグドール** / **🍊 茶トラ** / **🌸 三毛猫** / **🐄 ハチワレ（タキシード）** / **🤎 シャム猫** / **🐳 クジラ娘（BigFish）**（マウス＋手打ち＋水しぶき付きクジラ尾の 3 系統同時動作・Live2D 視線追従・打鍵速度連動の照れ＆笑顔）。右クリックやトレイから 0.1 秒で切替。
  - **🐾 しっぽタイピング 4 モード＆直接キー指定**：**スマート第 3 の手**（通常は両前足で打ち、同時押しや高速 Enter 時にしっぽが加勢）、**カスタム指定**（画面上のキーキャップをクリック、または物理キーボードを押すだけでトグル登録・遠端キーも体貫通なしの滑らか軌道）、**端エリアのみ**（`WASD` 保護）、**揺らすだけ** から選択可能。
  - **🙈 OS レベルのパスワード入力自動保護**：Windows（UI Automation `CurrentIsPassword` + Win32 `ES_PASSWORD`）および macOS（`IsSecureEventInputEnabled` + `AXSecureTextField`）でパスワード欄を自動検知し、Rust 層で打鍵情報を遮断。猫はやさしく目を閉じ、クジラ娘は両手で目を覆いキー表示を隠します。
  - **🎥 OBS 透過ブラウザソース内蔵**：クロマキー不要のローカル透過配信 URL（`http://127.0.0.1:27421/obs`、初期 OFF で負荷ゼロ）。デスクトップの猫を隠して OBS だけに映すモードやパスワード保護連動にも対応。
  - **🤖 ネイティブ MCP サーバー内蔵（AI でオリジナル猫を作成）**：Node.js や Python 不要。**Claude Desktop / Cursor / Antigravity / Windsurf / Cline** に愛猫の写真を送るだけで、毛色・模様・瞳の色・アクセントカラーを自動生成し **0.4 秒でデスクトップへ即時反映**。
- **65% / 108 フルサイズ配列 × 2 視点切替 × マウス左右独立認識**：
  - 65% コンパクトと 108 フルサイズ（F1〜F12・編集キー・テンキー・独立 `Num↵` 完備）をワンクリック切替。**猫目線（180°）** と **視聴者目線（正立印字）** の両方で 3D パースとマウス左右ボタン位置を自動同期。
  - マウス左（`L`）・右（`R`）・中/ホイールを個別の配色と 3D 影、`LMB`/`RMB` バッジで明確に区別（同時押し対応）。
- **240Hz 物理スプリングの豊かな仕草＆なでなでゴロゴロ音**：
  - 素早いカーソル追尾の **まん丸好奇心瞳**、連打時の **イカ耳＋しっぽ 3 連机叩き**、放置時の **香箱座り Zzz**、頭を往復でなでると細目＋Web Audio 合成のやさしいゴロゴロ音が鳴ります。
- **自動アップデート・クリック透過ロック・マルチモニター固定**：
  - GitHub Releases の自動チェック＆SHA-256 検証付きワンクリック更新、`Alt` 一時解除対応のクリック透過ロック、Windows / macOS のモニター指定固定＆macOS フルスクリーン空間オーバーレイに対応。

## 🤖 MCP 連携ガイド（AI で自分だけの猫を作る）

KuroCat `v4.0.0+` は追加依存なしで **Stdio** と **ローカル Streamable HTTP（`127.0.0.1:27420`）** の 2 方式 MCP サーバーを単体バイナリに内蔵しています。

### クイック設定
1. `KuroCat` を起動し、右クリック → **MCP 拡張を有効化** を確認 → **MCP 設定をコピー** をクリック。
2. 利用中の AI クライアント（Claude Desktop / Cursor / Antigravity / Windsurf / Cline）の設定ファイルに貼り付けます：

**方式 A：Stdio モード（全 MCP クライアント対応・推奨）**
```json
{
  "mcpServers": {
    "kurocat": {
      "command": "C:\\Users\\<ユーザー名>\\AppData\\Local\\KuroCat\\KuroCat.exe",
      "args": ["--mcp"]
    }
  }
}
```

**方式 B：ローカル HTTP モード（KuroCat 起動中に直接接続）**
```json
{
  "mcpServers": {
    "kurocat": {
      "url": "http://127.0.0.1:27420/mcp"
    }
  }
}
```

### プロンプト例
- *「KuroCat MCP を使って、琥珀色の瞳とアイスブルーのキーハイライトを持つブリティッシュショートヘアを作ってすぐ切り替えて」*
- *「このうちの三毛猫の写真を見て、KuroCat MCP で柄と目の色を再現した専用ペットを作って！」*
- *「KuroCat を 85% に縮小して 108 キー・視聴者目線に切り替え、しっぽで叩くキーを Enter と Space にして」*

### 内蔵 MCP ツール一覧
| ツール名 | 機能説明 |
| --- | --- |
| `list_cats` | 標準・カスタム全スキンと現在のアクティブ猫を取得 |
| `get_cat_schema` | 毛色・6 種パターン（`solid`/`bicolor`/`tuxedo`/`tabby`/`calico`/`siamese`）・模様座標仕様とテンプレートを取得 |
| `upsert_cat` | カスタム猫スキンの新規作成・更新（リアルタイム即時反映） |
| `switch_cat` | ID 指定で表示中のスキンを瞬時に切替 |
| `delete_cat` | 指定カスタムスキンの削除（または標準スキンの初期化） |
| `get_settings` / `update_settings` | スケール・配列・視点・しっぽモード/キー・キーバブル・ゴロゴロ音・最前面・透過ロック・OBS ソース・自動起動の取得/変更 |

カスタムスキンの保存先：
- **Windows**：`%APPDATA%\kuro-cat-pet\cats.json`
- **macOS**：`~/Library/Application Support/kuro-cat-pet/cats.json`

## 🛠️ ソースからビルド

必要環境：Windows 10/11 または macOS 11+、Node.js 18+、Rust ツールチェーン（`cargo`）。

```bash
git clone https://github.com/qianyiai/kurocat.git
cd kurocat
npm install
npm run tauri:dev      # ホットリロード開発起動
npm run tauri:build    # リリースバイナリ・インストーラーのビルド
```

## 📈 リアルタイム成長グラフ

<a href="https://qianyi.one/kurocat/?lang=ja#growth">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://qianyi.one/kurocat/api/growth-chart?theme=dark&amp;lang=ja" />
    <source media="(prefers-color-scheme: light)" srcset="https://qianyi.one/kurocat/api/growth-chart?theme=light&amp;lang=ja" />
    <img alt="KuroCat 累計ダウンロード数・GitHub Stars リアルタイム成長グラフ" src="https://qianyi.one/kurocat/api/growth-chart?theme=dark&amp;lang=ja" width="100%" />
  </picture>
</a>

> 📡 累計ダウンロード数と GitHub Stars をリアルタイム同期（GitHub のダーク／ライトテーマに自動対応）。[公式サイトでインタラクティブ版を見る →](https://qianyi.one/kurocat/?lang=ja#growth)

## ☕ 開発を支援する（寄付）

KuroCat は MIT ライセンスのもとで完全無料・オープンソースとして公開しています。作業や配信のお供として気に入っていただけたら、GitHub で ⭐ を付けていただくか、コーヒー一杯分の支援をいただけると励みになります：

- **ETH / BNB / USDT / USDC（EVM 共通アドレス）**  
  対応ネットワーク：`Ethereum (ERC-20)` · `BNB Smart Chain (BEP-20)` · `Base` · `Arbitrum`
  ```text
  0x40995b4c9ad8cd4356417a34ab94fa20d5844617
  ```

## 📄 ライセンスと謝辞

本プロジェクトは [MIT License](LICENSE) のもとで公開されています。

- 標準スキン **🐳 クジラ娘（BigFish）** のランタイム素材は MIT ライセンスのオープンソースプロジェクト [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（参考派生：[QCYTSN/dsh-dafeiyu](https://github.com/QCYTSN/dsh-dafeiyu)）をもとに制作しています。詳細は `src/assets/dafeiyu/LICENSE-MIT.txt` をご覧ください。
- コミュニティ貢献者の皆さまに心より感謝します：[@XYZliang](https://github.com/XYZliang)、[@CandySunPlus](https://github.com/CandySunPlus)（#51）、[@Jack-GPT](https://github.com/Jack-GPT)（#47, #64）、[@Mangome](https://github.com/Mangome)（#67, #68）、[@Zyred9](https://github.com/Zyred9)（#48）、[@bj-wangxiaoxiao](https://github.com/bj-wangxiaoxiao)（#65）、[@hacksmo](https://github.com/hacksmo)（#45）、[@LiMuhua](https://github.com/LiMuhua)（#75）。
