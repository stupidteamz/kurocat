# 🐈‍⬛ KuroCat — 무료 오픈소스 바탕화면 타이핑 검은 고양이 펫 (Bongo Cat 대안)

<p align="center">
  <a href="./README.md">🇨🇳 简体中文</a> &nbsp;|&nbsp;
  <a href="./README.en.md">🇺🇸 English</a> &nbsp;|&nbsp;
  <a href="./README.ja.md">🇯🇵 日本語</a> &nbsp;|&nbsp;
  <strong>🇰🇷 한국어</strong>
</p>

<p align="center">
  <a href="https://qianyi.one/kurocat/?lang=ko"><img src="https://img.shields.io/badge/Website-qianyi.one%2Fkurocat-d4f044?style=flat-square&logo=googlechrome&logoColor=111" alt="KuroCat Official Website" /></a>
  <a href="https://github.com/qianyiai/kurocat/releases/latest"><img src="https://img.shields.io/github/v/release/qianyiai/kurocat?style=flat-square&color=38bdf8" alt="Latest Release" /></a>
  <a href="https://github.com/qianyiai/kurocat/blob/main/LICENSE"><img src="https://img.shields.io/github/license/qianyiai/kurocat?style=flat-square&color=22c55e" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Platform-Win11%2F10%2F7%20%7C%20macOS%20%7C%20Linux%20%7C%20Android-818cf8?style=flat-square" alt="Cross Platform" />
</p>

> 🌐 **공식 웹사이트 · 브라우저 실시간 체험판 · 고속 다운로드**: [**https://qianyi.one/kurocat/**](https://qianyi.one/kurocat/) ([한국어 UI](https://qianyi.one/kurocat/?lang=ko))

**Windows(Win11/10 & Win7 SP1) · macOS(10.15+ Apple Silicon & Intel) · Linux(Ubuntu / Debian / KylinOS / UOS) · Android**를 지원하는 초경량 투명 최상단 바탕화면 타이핑·마우스 펫입니다. **Tauri v2(Rust 네이티브 전역 입력 훅 + 내장 MCP 서버 + Three.js 3D / HTML5 Canvas 2D 듀얼 엔진)** 기반으로 제작되어 외부 런타임 의존성 없이 약 24 MB 메모리로 가볍게 동작합니다. 기본 **✨ 3D 피규어 모드**와 **🎨 2D 클래식 드로잉**을 원클릭으로 전환할 수 있으며, **손그림 고양이 스킨 6종 + 🐳 고래소녀(BigFish)**(검은 고양이, 랙돌, 치즈 태비, 삼색이, 턱시도, 샴 고양이, 고래소녀), **선택형 3D 목걸이 방울 및 게임 자동 착용 게이밍 헤드셋(기본 꺼짐)**, **비밀번호 입력 시 자동 눈 가리기**, **4가지 커스텀 꼬리 타건 모드**, **OBS 네이티브 투명 브라우저 소스**, 그리고 반려묘 사진 한 장으로 AI가 0.4초 만에 나만의 펫을 만들어 주는 **내장 MCP 서버**를 모두 지원합니다.

## 🎬 3D 검은 고양이 인터랙션 데모 & 고래소녀 14초 영상

<table>
  <tr>
    <td align="center" width="52%" valign="top">
      <a href="https://qianyi.one/kurocat/?lang=ko#playground" target="_blank" rel="noopener">
        <img src="docs/wake-pet-demo-ko.webp" alt="KuroCat 3D 검은 고양이 데모 (낮잠 → 타자 소리에 잠깨서 화남 → 머리 쓰다듬기 골골송으로 기분 풀림)" width="380" />
      </a>
      <br/>
      <strong>🐈‍⬛ <a href="https://qianyi.one/kurocat/?lang=ko#playground">공식 웹사이트에서 3D 실시간 체험하기 (직접 타이핑 &amp; 쓰다듬기) →</a></strong>
      <br/>
      <sub>
        낮잠 → 타자 소리에 잠깸 화남 → 쓰다듬기 골골송으로 기분 풀림 · 고양이 6종 + 3D/2D 전환<br/>
        📥 <a href="https://qianyi.one/kurocat/media/wake-pet-9s-ko.mp4">골골송 사운드 포함 9초 MP4 보기/다운로드</a>
      </sub>
    </td>
    <td align="center" width="48%" valign="top">
      <a href="https://qianyi.one/kurocat/?lang=ko#whale-demo" target="_blank" rel="noopener">
        <img src="docs/whale-demo-ko.webp" alt="KuroCat 🐳 고래소녀(BigFish) 14초 세로 데모 영상" width="272" />
      </a>
      <br/>
      <strong>🐳 <a href="https://qianyi.one/kurocat/?lang=ko#whale-demo">1080×1920 60fps 사운드 포함 데모 영상 보기 →</a></strong>
      <br/>
      <sub>
        마우스 + 타이핑 + 고래꼬리 타건 3부위 동시 동작 → 고속 타건 시 발그레 &amp; 환한 웃음 → 비밀번호 두 손 눈 가리기<br/>
        📥 <a href="https://qianyi.one/kurocat/media/whale-douyin-14s-ko.mp4">고속 MP4 미러 다운로드</a> · <a href="https://github.com/qianyiai/kurocat/releases/download/v4.7.0/KuroCat-whale-demo-14s.mp4">GitHub 원본</a>
      </sub>
    </td>
  </tr>
</table>

## 📥 바로 다운로드 (Windows / Win7 / macOS / Linux / Android)

[Releases](https://github.com/qianyiai/kurocat/releases) 페이지 또는 아래 최신 **`v5.1.2`** 설치 파일로 바로 시작하세요. (**🤖 AI 코딩 컴패니언 실시간 상태 연동 — Doubao Work / WorkBuddy / DeepSeek Harness / Codex / Qwen / Antigravity / Claude Code 원클릭 연동으로 코딩 중 자동 대타 타이핑 + 승인 대기/오류/완료 알림 말풍선**, **MCP 2D/3D 얼굴·귀 형태 자유 조각(도구 10종 + 반점 16개)**, **2D/3D 전환 및 WebGL 자가 복구 + 사이드 메뉴 첫 클릭 즉각 반응**, **중복 실행 방지 · Win11 업데이트 잠금 수정 · macOS 절전 복귀/드래그 및 Linux 스케일 수정**, **✨ 3D / 🎨 2D 듀얼 엔진**, **5개 언어 다국어 UI**, **OBS 투명 방송 소스**, **비밀번호 눈 가리기** 모두 탑재):

- **🪟 Windows 10 / 11 (65% 클래식 설치판 · `v5.1.2`)**: [**`KuroCat-5.1.2-x64-setup.exe`**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-5.1.2-x64-setup.exe) (2.15 MB) | [**고속 미러 다운로드**](https://qianyi.one/kurocat/?lang=ko#download)
  - 기본 65% 콤팩트 기계식 키보드로 시작하며 바탕화면 **`KuroCat`** 아이콘, 시작 메뉴 및 제거 항목을 자동 생성합니다. 우클릭 또는 시스템 트레이에서 **108 풀배열**, **🐳 고래소녀**, **OBS 투명 소스**, **업데이트 확인**으로 언제든 전환할 수 있습니다.
  - **자주 묻는 질문 (FAQ)**:
    - **Edge / Chrome에서 "일반적으로 다운로드되지 않음" 또는 Windows SmartScreen 경고가 뜨나요?** (상용 EV 코드 서명이 없는 100% 공개 오픈소스 소프트웨어입니다):
      - **Edge**: 다운로드 항목에 마우스를 올린 뒤 **`···`** → **유지** → 삭제 버튼 옆 **`▾` (더 보기)** → **그래도 유지** 선택.
      - **Chrome**: `Ctrl + J`로 다운로드 목록 열기 → **위험한 파일 유지** → **계속 유지** 선택.
      - **SmartScreen 파란 경고창**: **추가 정보** → **실행** 클릭.
    - 구형 Win10 / LTSC 환경에서 `WebView2 Runtime` 누락 안내가 뜨면 Microsoft 공식 1.8 MB 설치 도구를 관리자 권한으로 실행하세요: [`MicrosoftEdgeWebview2Setup.exe`](https://go.microsoft.com/fwlink/p/?LinkId=2124703).
    - **전체화면 게임 / 관리자 권한 / OBS 방송**: 테두리 없는 창 및 FSO 게임에서 포커스를 빼앗지 않는 최상단 가드를 내장했습니다(**클릭 통과 잠금** 켜기 + `Alt` 키로 언제든 임시 이동/잠금 해제 권장). 관리자 권한으로 실행되는 게임은 트레이에서 **관리자 권한으로 다시 시작**을 선택하세요. OBS 방송은 우클릭 → **OBS 소스 주소 복사**(`http://127.0.0.1:27421/obs`, 크로마키 불필요, **OBS 전용 표시** 및 비밀번호 눈 가리기 연동)를 사용하세요. 커널 안티치트 게임(발로란트 등)은 트레이에서 **입력 감지 일시정지 및 숨기기 (안티치트 보호)**를 켜는 것을 권장합니다.
- **🖥️ Windows 7 SP1 (64비트 전용 포터블 · `v5.1.2`)**: [**`KuroCat-v5.1.2-win7-x64-portable.zip`**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-win7-x64-portable.zip) (178.94 MB) | [**고속 미러 다운로드**](https://qianyi.one/kurocat/releases/v5.1.2/KuroCat-v5.1.2-win7-x64-portable.zip)
  - 네이티브 PE 6.01 빌드(Win8/Win10 DLL 의존성 0)로 Microsoft 마지막 Win7 오프라인 **WebView2 109.0.1518.78** 런타임을 내장하고, Aero 사용 여부와 무관하게 흰 테두리나 계단 현상 없는 **256단계 픽셀 투명(`UpdateLayeredWindow`)** 렌더링을 지원합니다. 압축을 모두 풀고 `KuroCat.exe`와 `WebView2Runtime`을 같은 폴더에 둔 채 실행하세요.
- **🍎 macOS 10.15 Catalina+ (Apple Silicon M1–M4 & Intel 유니버설 · `v5.1.2`)**: [**`KuroCat-v5.1.2-macos-universal.dmg`**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-macos-universal.dmg) (5.93 MB) | [**고속 미러 다운로드**](https://qianyi.one/kurocat/releases/v5.1.2/KuroCat-v5.1.2-macos-universal.dmg)
  - **🍺 Homebrew 한 줄 설치 (추천)**: `brew install --cask qianyiai/tap/kurocat` (`brew upgrade --cask kurocat` 업그레이드 지원 및 macOS 격리 속성 자동 해제).
  - `.dmg`를 열어 `KuroCat.app`을 **응용 프로그램** 폴더로 드래그해 실행하세요. 3D/2D 전환, 65%/108키 배열, 7종 스킨이 모두 포함됩니다.
  - **첫 실행 안내 (미공증 오픈소스 앱)**: "개발자를 확인할 수 없음" 또는 "손상됨" 알림이 표시되면 터미널에서 한 번만 `xattr -cr /Applications/KuroCat.app`을 실행하세요(이후 앱 내 자동 업데이트 시 자동 처리됩니다).
  - **키보드·마우스 감지 권한**: **시스템 설정 → 개인정보 보호 및 보안**에서 **손쉬운 사용**과 **입력 모니터링** 모두에 `KuroCat`을 허용하세요(즉시 반영, Karabiner-Elements 호환).
  - **macOS Stdio MCP 경로**: `/Applications/KuroCat.app/Contents/MacOS/KuroCat` (인자 `["--mcp"]`) 또는 실행 중 `http://127.0.0.1:27420/mcp`로 직접 연결.
- **🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+ / UOS (`v5.1.2`)**:
  - **x86_64**: [**`.deb` (2.38 MB)**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-amd64.deb) · [**`.AppImage` (77.52 MB)**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-amd64.AppImage)
  - **ARM64**: [**`.deb` (2.34 MB)**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-arm64.deb) · [**`.AppImage` (75.69 MB)**](https://github.com/qianyiai/kurocat/releases/download/v5.1.2/KuroCat-v5.1.2-linux-arm64.AppImage)
  - **시스템 요구사항**: Tauri v2 / Ubuntu 22.04 기반으로 빌드되어 **`glibc >= 2.34`**가 필요합니다(`.deb` 패키지는 **`libwebkit2gtk-4.1-0`** 및 **`libayatana-appindicator3-1`** 필요; Ubuntu 20.04 / `glibc 2.31` 기반 KylinOS V10 SP1은 미지원).
  - 루트 권한 없이 X11 `XRecord` 전역 입력을 동적 로드하며(Wayland에서는 `evdev` 자동 폴백), 고속 미러는 [`https://qianyi.one/kurocat/?lang=ko#linux-download`](https://qianyi.one/kurocat/?lang=ko#linux-download)에서 받을 수 있습니다.
- **🤖 Android**: 최신 Android 플로팅 펫 APK 및 전체 플랫폼 패키지는 [GitHub Releases](https://github.com/qianyiai/kurocat/releases)에서 확인할 수 있습니다.

## ✨ 핵심 기능

<table>
  <tr>
    <td align="center" width="50%">
      <img src="website/public/assets/showcase-108key.webp" alt="65% 콤팩트 / 108 풀배열 × 고양이 시점 / 시청자 시점" />
      <br/><sub>65% 콤팩트 / 108 풀배열 × 고양이 시점 / 시청자 시점</sub>
    </td>
    <td align="center" width="50%">
      <img src="website/public/assets/showcase-mouse.webp" alt="마우스 좌/우 클릭 독립 하이라이트 + 앱 내 자동 업데이트" />
      <br/><sub>마우스 좌/우 버튼 독립 하이라이트 + 앱 내 자동 업데이트</sub>
    </td>
  </tr>
</table>

- **✨ 3D 피규어 & 🎨 2D 클래식 듀얼 엔진 + 선택형 액세서리**:
  - Three.js 기반의 부드러운 림 라이트와 입체감을 갖춘 **3D 피규어 모드**가 기본이며, 우클릭 메뉴나 트레이에서 언제든 **2D 클래식 드로잉**으로 원클릭 전환할 수 있습니다.
  - **선택형 3D 목걸이 방울 & 게이밍 헤드셋 (기본 꺼짐)**: 빨강·파랑·분홍·초록 4가지 색상의 방울 목걸이와, PC 게임 실행을 자동 감지해 알아서 쓰고 벗는 게이밍 헤드셋을 지원합니다.
- **기본 스킨 7종 (고양이 6종 + 🐳 고래소녀) + MCP 무제한 AI 커스텀**:
  - **🐈‍⬛ 검은 고양이** / **🐱 랙돌** / **🍊 치즈 태비** / **🌸 삼색이** / **🐄 턱시도** / **🤎 샴 고양이** / **🐳 고래소녀(BigFish)** (왼손 마우스 + 오른손 타이핑 + 물보라 고래꼬리 타건 3부위 동시 동작, Live2D 시선 추적, 타건 속도 반응 볼터치 & 환한 웃음). 0.1초 만에 즉시 전환됩니다.
  - **🐾 4가지 커스텀 꼬리 타건 모드 & 키보드 직접 선택**: **스마트 보조**(평소 양손 타건, 바쁘거나 빠른 Enter 시 꼬리 자동 지원), **커스텀**(펫 키보드의 키캡 클릭 또는 실제 키 입력으로 지정, 원거리 키도 몸통 관통 없는 부드러운 궤적), **가장자리**(`WASD` 보호), **흔들기만** 중 선택 가능.
  - **🙈 OS 수준 비밀번호 입력 자동 눈 가리기**: Windows(UI Automation `CurrentIsPassword` + Win32 `ES_PASSWORD`) 및 macOS(`IsSecureEventInputEnabled` + `AXSecureTextField`) 비밀번호 입력란을 자동 감지해 Rust 계층에서 키 입력을 차단합니다. 고양이는 부드럽게 눈을 감고, 고래소녀는 두 손으로 눈을 가리며 키캡과 말풍선을 숨깁니다.
  - **🎥 네이티브 OBS 투명 브라우저 소스**: 크로마키 없이 바로 알파 투명 채널을 지원하는 로컬 방송 서버(`http://127.0.0.1:27421/obs`, 기본 꺼짐으로 부하 0), **OBS 전용 표시** 및 비밀번호 가리기 연동을 지원합니다.
  - **🤖 내장 MCP 서버 (AI로 나만의 고양이 제작)**: Node.js나 Python 없이 **Claude Desktop / Cursor / Antigravity / Windsurf / Cline**에 반려묘 사진을 보내면 털색·무늬·반점·눈동자 색을 자동 생성해 **0.4초 만에 바탕화면에 실시간 반영**합니다.
- **65% / 108 풀배열 + 양방향 시점 + 마우스 좌/우/휠 독립 인식**:
  - **65% 콤팩트**와 **108 풀배열**(F1–F12, 편집 키, 멀티미디어 키, 2U `+` 및 독립 `Num↵` 넘패드 완비) 전환 및 **고양이 시점(180°)** / **시청자 시점(정방향 각인)** 전환 시 3D 원근과 마우스 좌우 버튼 방향도 자동 동기화됩니다.
  - 좌클릭(`L`), 우클릭(`R`), 휠/중간 클릭을 선명한 대비 색상과 3D 눌림 음영, `LMB`/`RMB` 미니 말풍선으로 독립 표시합니다(동시 누름 지원).
- **240Hz 물리 스프링 감정 표현 & 쓰다듬기 골골송**:
  - 빠른 커서 추적 시 **호기심 큰 눈동자**, 연타 시 **비행기 귀 + 꼬리 3연타 책상 쿵**, 대기 시 **식빵 굽고 Zzz 졸기**, 머리를 좌우로 쓰다듬으면 눈을 가늘게 뜨며 Web Audio 실시간 합성 골골송이 재생됩니다.
- **앱 내 자동 업데이트 · 클릭 통과 잠금 · 멀티 모니터 고정**:
  - SHA-256 검증 원클릭 업그레이드, `Alt` 임시 해제 지원 클릭 통과 잠금, Windows/macOS 모니터별 위치 고정 및 macOS 13+ 전체화면 공간 위 플로팅을 지원합니다.

## 🤖 MCP 연동 가이드 (AI로 나만의 고양이 만들기)

KuroCat `v4.0.0+`은 추가 의존성 없이 **Stdio**와 **로컬 Streamable HTTP(`127.0.0.1:27420`)** 듀얼 모드 MCP 서버를 단일 바이너리에 내장하고 있습니다.

### 빠른 설정
1. `KuroCat`을 실행한 뒤 펫 우클릭 → **MCP 서버 켜기** 확인 → **MCP 설정 복사** 클릭.
2. 사용 중인 AI 클라이언트(Claude Desktop / Cursor / Antigravity / Windsurf / Cline)의 MCP 설정에 붙여넣으세요:

**방식 A: Stdio 모드 (추천 · 모든 MCP 클라이언트 지원)**
```json
{
  "mcpServers": {
    "kurocat": {
      "command": "C:\\Users\\<사용자명>\\AppData\\Local\\KuroCat\\KuroCat.exe",
      "args": ["--mcp"]
    }
  }
}
```

**방식 B: 로컬 Streamable HTTP 모드 (KuroCat 실행 중 직접 연결)**
```json
{
  "mcpServers": {
    "kurocat": {
      "url": "http://127.0.0.1:27420/mcp"
    }
  }
}
```

### AI 프롬프트 예시
- *"KuroCat MCP로 호박색 눈동자와 아이스블루 키 하이라이트를 가진 브리티시 숏헤어 블루 고양이를 만들어 바로 적용해 줘."*
- *"우리 집 삼색이 사진을 보고 KuroCat MCP로 털 무늬와 눈 색깔이 똑같은 전용 바탕화면 펫을 만들어 줘!"*
- *"KuroCat 크기를 85%로 줄이고 108 풀배열 시청자 시점으로 바꾼 뒤, 꼬리 타건 키를 Enter와 Space로 설정해 줘."*

### 내장 MCP 도구 목록
| 도구 이름 | 기능 설명 |
| --- | --- |
| `list_cats` | 모든 기본·커스텀 스킨과 현재 활성화된 스킨 ID 조회 |
| `get_cat_schema` | 털색·무늬 6종(`solid`/`bicolor`/`tuxedo`/`tabby`/`calico`/`siamese`)·반점 좌표 스키마 및 프리셋 조회 |
| `upsert_cat` | 커스텀 고양이 스킨 생성·수정 (실시간 핫 리로드 반영) |
| `switch_cat` | ID로 바탕화면 활성 펫 즉시 전환 |
| `delete_cat` | 지정 커스텀 스킨 삭제 (또는 기본 스킨 복원) |
| `get_settings` / `update_settings` | 크기, 배열, 시점, 꼬리 모드/키, 말풍선, 골골송, 항상 위, 클릭 통과 잠금, OBS 소스 및 자동 실행 조회/변경 |

커스텀 스킨 저장 위치:
- **Windows**: `%APPDATA%\kuro-cat-pet\cats.json`
- **macOS**: `~/Library/Application Support/kuro-cat-pet/cats.json`

## 🛠️ 소스에서 직접 빌드

사전 요구사항: Windows 10/11 또는 macOS 11+, Node.js 18+, Rust 툴체인(`cargo`).

```bash
git clone https://github.com/qianyiai/kurocat.git
cd kurocat
npm install
npm run tauri:dev      # 핫 리로드 개발 실행
npm run tauri:build    # 릴리스 바이너리 및 설치 파일 빌드
```

## 📈 실시간 성장 그래프

<a href="https://qianyi.one/kurocat/?lang=ko#growth">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://qianyi.one/kurocat/api/growth-chart?theme=dark&amp;lang=en" />
    <source media="(prefers-color-scheme: light)" srcset="https://qianyi.one/kurocat/api/growth-chart?theme=light&amp;lang=en" />
    <img alt="KuroCat 실시간 다운로드 및 GitHub Stars 성장 그래프" src="https://qianyi.one/kurocat/api/growth-chart?theme=dark&amp;lang=en" width="100%" />
  </picture>
</a>

> 📡 전체 채널 누적 다운로드 수와 GitHub Stars를 실시간으로 동기화합니다(GitHub 다크/라이트 테마 자동 대응). [공식 웹사이트에서 인터랙티브 그래프 보기 →](https://qianyi.one/kurocat/?lang=ko#growth)

## ☕ 후원 및 응원

KuroCat은 MIT 라이선스 하에 완전 무료 오픈소스로 공개됩니다. 코딩, 업무, 방송 중 작은 즐거움이 되었다면 GitHub ⭐ Star를 눌러 주시거나 커피 한 잔으로 응원해 주세요:

- **ETH / BNB / USDT / USDC (EVM 공용 주소)**  
  지원 네트워크: `Ethereum (ERC-20)` · `BNB Smart Chain (BEP-20)` · `Base` · `Arbitrum`
  ```text
  0x40995b4c9ad8cd4356417a34ab94fa20d5844617
  ```

## 📄 라이선스 및 감사의 글

본 프로젝트는 [MIT License](LICENSE)로 배포됩니다.

- 기본 스킨 **🐳 고래소녀(BigFish)** 런타임 리소스는 MIT 라이선스 오픈소스 프로젝트 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)([QCYTSN/dsh-dafeiyu](https://github.com/QCYTSN/dsh-dafeiyu) 참고 파생)를 기반으로 제작되었습니다. 자세한 라이선스는 `src/assets/dafeiyu/LICENSE-MIT.txt`를 참고하세요.
- 함께 기여해 주신 모든 커뮤니티 컨트리뷰터분들께 감사드립니다: [@XYZliang](https://github.com/XYZliang), [@CandySunPlus](https://github.com/CandySunPlus) (#51), [@Jack-GPT](https://github.com/Jack-GPT) (#47, #64), [@Mangome](https://github.com/Mangome) (#67, #68), [@Zyred9](https://github.com/Zyred9) (#48), [@bj-wangxiaoxiao](https://github.com/bj-wangxiaoxiao) (#65), [@hacksmo](https://github.com/hacksmo) (#45), [@LiMuhua](https://github.com/LiMuhua) (#75).
