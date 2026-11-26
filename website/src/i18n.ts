import type { TailKeyMode } from '../../src/catEngine';

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

export const LANG_STORAGE_KEY = 'qianyi_lang';

export function normalizeLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'zh' || v.startsWith('zh-')) return 'zh';
  if (v === 'en' || v.startsWith('en-')) return 'en';
  if (v === 'ja' || v === 'jp' || v.startsWith('ja-')) return 'ja';
  if (v === 'ko' || v === 'kr' || v.startsWith('ko-')) return 'ko';
  return null;
}

export function detectInitialLocale(): Locale {
  try {
    const param = new URLSearchParams(window.location.search).get('lang');
    const fromQuery = normalizeLocale(param);
    if (fromQuery) {
      localStorage.setItem(LANG_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const saved = normalizeLocale(localStorage.getItem(LANG_STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // Ignore storage/URL access errors in restricted contexts
  }
  const nav = normalizeLocale(navigator.language);
  return nav ?? 'en';
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, locale);
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', locale);
      window.history.replaceState(null, '', url.toString());
    }
  } catch {
    // Ignore restricted history/storage environments
  }
}

export interface KuroCatI18nBundle {
  htmlLang: string;
  docTitle: string;
  metaDesc: string;
  text: Record<string, string>;
  html: Record<string, string>;
  placeholders: Record<string, string>;
  titles: Record<string, string>;
  ariaLabels: Record<string, string>;
  alts: Record<string, string>;
  downloads: Record<string, string>;
  prompts: Record<string, string>;
  skins: Record<string, string>;
  tailModeShort: Record<TailKeyMode, string>;
  mcpSnippets: Record<'win' | 'mac' | 'http', { raw: string; html: string }>;
  fmt: {
    latestVersion: (tag: string) => string;
    heroDownloadWin: (size: string) => string;
    heroDownloadMac: (size: string) => string;
    layout: (id: '65' | '108') => string;
    orient: (o: 'cat' | 'viewer') => string;
    tailPickerBtn: (open: boolean, count: number) => string;
    tailPickerTitleDefault: (count: number) => string;
    tailKeyAdded: (key: string, count: number) => string;
    tailKeyRemoved: (key: string, count: number) => string;
    tailPresetApplied: (preset: 'office' | 'rightFn' | 'edgeMods', count: number) => string;
    tailCleared: () => string;
    autoDemoBtn: (running: boolean) => string;
    privacyBtn: (active: boolean) => string;
    whaleSoundBtn: (muted: boolean) => string;
    copied: () => string;
    copyConfig: () => string;
    copyCmd: () => string;
    copyShort: () => string;
    totalDownloads: (count: string) => string;
    statsUpdated: (timePart: string) => string;
  };
}

export const KUROCAT_I18N: Record<Locale, KuroCatI18nBundle> = {
  zh: {
    htmlLang: 'zh-CN',
    docTitle: 'KuroCat — Free Open-Source 3D Desktop Typing Cat & AI Companion | 官方主页 (Win/Mac/Linux/Android)',
    metaDesc:
      'KuroCat (github.com/qianyiai/kurocat) — 免费开源 3D/2D 透明置顶桌面打字小黑猫与 AI 编程伴侣（Bongo Cat 开源替代）。支持 Windows/macOS(Homebrew)/Linux/Android，6 款猫咪 + 大肥鱼、Claude/Codex/DeepSeek/豆包状态联动、OBS 免抠像透明源、输密码自动闭眼防偷窥与 MCP AI 捏猫。',
    text: {
      'nav.back': '← 谦一',
      'nav.playground': '在线试玩',
      'nav.whale': '鲸鱼娘视频',
      'nav.download': '立即下载',
      'nav.features': '核心特性',
      'nav.mcp': 'AI 捏猫',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': '全部平台与版本',
      'hero.ghSource': 'GitHub 源码 ›',
      'hero.spec1Lbl': '原生 Rust 安装包体积',
      'hero.spec2Val': '7 款 + MCP',
      'hero.spec2Lbl': '猫咪 & 鲸鱼娘 · AI 定制',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': '支持 Apple Silicon · Win7 · 麒麟',
      'pg.title': '实时网页引擎 · 直接敲键盘或摸猫头',
      'pg.mode3d': '✨ 3D 立体',
      'pg.mode2d': '🎨 2D 经典',
      'pg.bgDark': '深色桌布',
      'pg.bgLight': '浅色桌布',
      'pg.hintKey': '⌨️ 敲键盘',
      'pg.hintMouse': '🖱️ 点左/右键',
      'pg.hintPet': '🤚 来回摸猫头',
      'pg.done': '完成',
      'pg.presetOffice': '回车空格',
      'pg.presetRightFn': '方向/小键盘',
      'pg.presetEdgeMods': '外侧功能键',
      'pg.presetClear': '清空',
      'pg.lblSkin': '切换皮肤',
      'pg.layout65': '65% 紧凑',
      'pg.layout108': '108 全尺寸',
      'pg.orientCat': '面向猫咪',
      'pg.orientViewer': '面向观众',
      'pg.btnMouse': '🖱️ 左右键',
      'pg.btnCurious': '👀 好奇眼',
      'pg.btnCross': '💢 尾巴捶桌',
      'pg.btnSleep': '💤 打瞌睡',
      'pg.btnBubbles': '💬 气泡',
      'pg.btnPurr': '🔊 呼噜',
      'pg.btnHeadphones': '🎧 电竞耳机',
      'pg.btnOrbit': '🔄 360° 旋转',
      'pg.lblCollar': '3D 项圈',
      'pg.collarNone': '无',
      'pg.collarRed': '🔴 红',
      'pg.collarBlue': '🔵 蓝',
      'pg.collarPink': '🩷 粉',
      'pg.collarGreen': '🟢 绿',
      'pg.lblTail': '尾巴拍键',
      'pg.tailSmart': '智能第三只手',
      'pg.tailCustom': '自定义',
      'pg.tailEdge': '近尾边缘',
      'pg.tailOff': '仅摆动',
      'pg.lblPwd': '密码测试',
      'pg.lblScale': '无级缩放',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': '免费下载，3 秒住进你的桌面',
      'dl.winName': 'Windows 65% 经典安装版',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': '推荐',
      'dl.primaryBtn': '高速直链下载',
      'dl.ghBtn': 'GitHub 官方源 ›',
      'dl.macName': 'macOS 通用版（M 芯片 & Intel）',
      'dl.macSub': 'macOS 10.15+ (Catalina 及以上) Universal DMG',
      'dl.tipWinTitle': '🛡️ Windows 浏览器提示「通常不会下载 .exe / 保护你的电脑」怎么办？',
      'dl.tipBrewTitle': '🍺 macOS Homebrew 一键安装（推荐 · 自动免隔离）',
      'dl.tipMacTitle': '🍎 macOS 首次打开说明（仅需一次 · 无需开着终端）',
      'dl.copyCmd': '复制命令',
      'dl.tipWv2Title': '🪟 Windows 提示「Could not find the WebView2 Runtime」怎么办？',
      'dl.tipWv2Btn': '下载微软 WebView2 运行环境 ›',
      'dl.win7Title': '🖥️ Windows 7 SP1（64 位）专属兼容绿包版（内置 WebView2 109）',
      'dl.win7Btn': '下载 Win7 兼容绿包版（178.99 MB）',
      'dl.win7Gh': 'GitHub 官方源（Win7 绿包）›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / 银河麒麟 V11+ / 优麒麟（x86_64 & ARM64）',
      'dl.linuxX64Deb': 'x86_64 .deb（2.39 MB）',
      'dl.linuxArmDeb': 'ARM64 飞腾/麒麟 .deb（2.35 MB）',
      'dl.linuxX64AppImage': 'x86_64 AppImage（77.53 MB）›',
      'dl.linuxArmAppImage': 'ARM64 AppImage（75.70 MB）›',
      'dl.tipGameTitle': '🎮 游戏全屏 / OBS 直播怎么显示小黑猫？（含反作弊安全提示）',
      'feat.title': '把桌宠，做到强迫症级别的丝滑',
      'feat.whaleEyebrow': 'New Skin · 🐳 BigFish (鲸鱼娘) · 14s Video',
      'feat.whaleSpec1Val': '三线同动',
      'feat.whaleSpec1Lbl': '鼠标 + 手打字 + 鲸尾甩拍',
      'feat.whaleSpec2Val': '手速感应',
      'feat.whaleSpec2Lbl': '加速触发害羞脸红 → 大笑',
      'feat.whaleSpec3Val': '自动捂眼',
      'feat.whaleSpec3Lbl': '输密码自动闭眼防偷窥',
      'feat.whaleTryBtn': '在上方画布切到大肥鱼试玩 ↑',
      'feat.whaleDlBtn': '下载 1080P 竖屏演示（14s）',
      'feat.whaleMeta': '1080×1920 · 60fps · 14s 含同步键鼠音效',
      'feat.kbSpec1Val': '108 键',
      'feat.kbSpec1Lbl': '完整 F 区与数字小键盘',
      'feat.kbSpec2Val': '双视角',
      'feat.kbSpec2Lbl': '面向猫咪 / 面向观众',
      'feat.kbSpec3Val': '真键值',
      'feat.kbSpec3Lbl': '独立区分主回车与 Num↵',
      'feat.kbTryBtn': '在上方画布试玩 108 键 ↑',
      'feat.mouseSpec1Lbl': '左右中键完全独立高亮',
      'feat.mouseSpec2Lbl': '自动更新摘要校验',
      'feat.mouseSpec3Val': '一键升级',
      'feat.mouseSpec3Lbl': 'Win / Mac 静默重启',
      'bento.1Title': '双标签免滚动菜单 & 记忆穿透',
      'bento.1Body': '右键浮窗拆分为「外观与互动 / 键盘·OBS·系统」双标签一屏看完，20%–150% 无级缩放不裁切；重启自动记住鼠标穿透锁定并带启动一键解锁防误锁。',
      'bento.2Title': '摸头眯眼 & 合成呼噜声',
      'bento.2Body': '鼠标移到猫头自动变身小手光标，来回抚摸触发慵懒眯眼与 Web Audio 24.5Hz 实时合成的温柔猫咪呼噜声。',
      'bento.3Title': '输密码自动闭眼防偷窥',
      'bento.3Body': '系统级自动识别 Windows / macOS 密码输入框：底层钩子拦截不外传按键，猫咪温柔闭眼、大肥鱼双手捂眼并遮蔽键帽与气泡。',
      'bento.4Title': 'GPU 合批重构 & 游戏自动省电',
      'bento.4Body': '3D 键帽图集合批与全 GPU 顶点变形，活跃态显卡占用直降 75%；检测到游戏自动切换 30 FPS 省电模式（最高降 88.5%），双显卡优先核显零负担。',
      'mcp.p1Text': '💬 “帮我用 KuroCat MCP 捏一只英短蓝猫并切过去”',
      'mcp.p2Text': '📸 “按这张我家猫的照片，给我定制一只专属桌宠！”',
      'mcp.p3Text': '⚙️ “把桌宠缩放到 85%，切到 108 键面向观众”',
      'mcp.copyShort': '复制',
      'mcp.tabHttp': '本机 HTTP',
      'mcp.footerMeta': '支持 7 个内置工具 · 0.4s 热重载',
      'mcp.copyCfg': '复制配置',
      'growth.eyebrow': 'Live Growth · Real-Time Telemetry',
      'growth.title': '实时增长曲线',
      'growth.sub': '实时追踪全渠道累计下载量与 GitHub Stars 增长轨迹，移动鼠标查看各时段精确数据。',
      'growth.dlLbl': '累计下载量',
      'growth.starLbl': 'GitHub Stars',
      'growth.modeBoth': '双曲线',
      'growth.modeDl': '仅下载',
      'growth.modeStars': '仅 Stars',
      'growth.loading': '正在同步实时增长数据…',
      'growth.starCta': '⭐ 去 GitHub 点颗星支持开源 ›',
      'donate.eyebrow': 'Support Open Source · Crypto',
      'donate.title': '请小黑猫喝杯咖啡',
      'donate.sub': 'KuroCat 完全免费且以 MIT 协议开源。如果这只桌面小猫陪你写代码、办公或直播时带来过好心情，欢迎支持作者持续维护与免费分发。',
      'donate.addrLbl': 'ETH / BNB / USDT / USDC · EVM 链通用地址',
      'donate.copy': '复制地址',
      'footer.home': '谦一主页',
      'footer.pelican': '鹈鹕测试专区',
      'footer.donate': '赞助支持',
      'footer.releases': '所有版本 (Releases)',
    },
    html: {
      'hero.title': 'KuroCat · 敲键盘的小黑猫<br /><span>住进你的桌面</span>',
      'hero.sub':
        '免费开源的透明置顶桌面键鼠伴侣，支持 <strong>3D 手办 / 2D 经典</strong> 一键切换，超低占用不卡游戏。内置 <strong>6 款猫咪 + 大肥鱼</strong>，支持摸头呼噜、输密码自动闭眼、OBS 直播与 <strong>AI 捏猫</strong>。',
      'dl.sub':
        '所有安装包均内置 <strong>20%–150% 无级缩放</strong>、<strong>65% / 108 键随时切换</strong>、<strong>自定义尾巴拍键</strong> 与 <strong>App 内自动更新</strong>。<br />默认提供 <code>kurocat.org</code> 国内高速直链，同时保留 GitHub Releases 官方原链与 SHA-256 校验。',
      'dl.winDesc':
        '开箱即 65% 紧凑机械键盘，自动创建桌面 <code>KuroCat</code> 图标、开始菜单与系统卸载入口；右键随时可一键切换 <strong>108 键全尺寸小键盘</strong>、<strong>自定义尾巴按键</strong> 与内置自更新。',
      'dl.macDesc':
        '原生编译 ARM64 + x86_64 通用镜像，兼容 M1/M2/M3/M4 与老款 Intel Mac（macOS 10.15 Catalina 及以上），内置 65% / 108 键、6 款猫咪与大肥鱼皮肤。打开 <code>.dmg</code> 拖入「应用程序」即可运行。',
      'dl.tipWinBody':
        '由于本项目为免费开源软件、未购买商业 EV 代码签名证书，Edge 浏览器在下载新版本 <code>.exe</code> 时可能会弹出「通常不会下载」提示（全部源码已在 GitHub 公开，可放心使用）：<br /><strong>① Edge 浏览器保留步骤</strong>：鼠标移到下载记录上 → 点右侧<strong>三个点 <code>···</code></strong> → 点<strong>「保留」</strong> → 弹窗显示「删除」按钮时，点击旁边的<strong>下箭头 <code>▾</code>（显示更多）</strong> → 选择<strong>「仍然保留」</strong>即可下载完成（Chrome 请按 <code>Ctrl + J</code> 打开下载页 → 点「保留危险文件」→「仍然保留」）。<br /><strong>② 双击安装若弹出蓝框「Windows 已保护你的电脑」</strong>：点击<strong>「更多信息」</strong> → 点击<strong>「仍要运行」</strong>即可完成安装。',
      'dl.tipBrewBody':
        '已上线官方 Homebrew Tap（<code>qianyiai/homebrew-tap</code>），终端执行右侧一行命令即可直接安装并自动清理隔离属性（免手动 <code>xattr</code>），后续可随时运行 <code>brew upgrade --cask kurocat</code> 一键升级。',
      'dl.tipMacBody':
        '由于本项目为免费开源未公证应用，首次拖入「应用程序」后若提示「无法验证开发者」或「已损坏」，<strong>请勿进入包内容用终端运行</strong>，只需打开一次终端粘贴执行右侧命令即可彻底解除隔离（跑完可关闭终端，后续直接双击图标打开）。全局键鼠响应请在<strong>「系统设置 → 隐私与安全性」</strong>中同时勾选<strong>「辅助功能」与「输入监控」</strong>里的 <code>KuroCat</code>，即开即生效（兼容 Karabiner-Elements）。',
      'dl.tipWv2Body':
        '常见于较老 Win10 / LTSC 精简版、卸过 Edge 浏览器或直接运行绿色单文件版的电脑（<strong>Win7 用户请直接下载下方专属兼容绿包版</strong>）。优先推荐安装上方<strong>正式安装版（setup.exe）</strong>，或点击右侧下载微软官方 WebView2 引导程序（1.8 MB），<strong>右键 → 以管理员身份运行</strong>装完即可全机生效。',
      'dl.win7Body':
        '专为 Windows 7 SP1 64 位单独编译适配（原生 PE 6.01，零 Win8/Win10 DLL 依赖，内置微软官方最后一版支持 Win7 的 <strong>WebView2 109.0.1518.78</strong> 离线内核，并启用 Win7 原生 256 级逐像素透明抗锯齿渲染，无论是否开启 Aero 均无白底框与锯齿）。下载后请先<strong>全部解压</strong>，保持 <code>KuroCat.exe</code> 与 <code>WebView2Runtime</code> 同目录，直接双击运行即可。',
      'dl.linuxBody':
        '原生支持 X11 全局键鼠监听（免 root）与 Wayland <code>evdev</code> 降级、透明无边框置顶、鼠标穿透（按住 <code>Alt</code> 临时拖动）及开机自启。需要 <strong><code>glibc &gt;= 2.34</code></strong>（基于 Ubuntu 22.04+ / Debian 12+ / 银河麒麟 V11+，暂不支持基于 Ubuntu 20.04 / <code>glibc 2.31</code> 的银河麒麟 V10 SP1）。优先推荐下载轻量 <strong>.deb 安装包（2.4 MB）</strong>（需 <code>libwebkit2gtk-4.1-0</code>，双击或 <code>sudo apt install ./KuroCat-*.deb</code>）；无管理员权限可直接运行 <strong>.AppImage 绿色版</strong>（<code>chmod +x</code> 后双击）。',
      'dl.tipGameBody':
        '<strong>① 单机与常规游戏</strong>：在 Win10/11 全屏优化（FSO）或「无边框窗口化」下内置持续 Z 序置顶守卫且绝不抢焦点；建议开启「锁定鼠标穿透」（按住 <code>Alt</code> 键随时临时拖动或右键解锁）。若游戏以管理员权限运行导致无法捕获键鼠，右键系统托盘点<strong>「以管理员身份重启（捕获游戏键鼠）」</strong>即可。<br /><strong>② OBS 直播 / 录屏（原生免抠像）</strong>：右键小猫或系统托盘点<strong>「复制 OBS 透明源地址」</strong>（自动开启本机 <code>http://127.0.0.1:27421/obs</code>，默认关闭零开销），在 OBS 添加「浏览器」来源即可直接获得原生 Alpha 透明通道（无需绿幕抠像，支持「仅 OBS 显示」隐藏桌面猫，密码防偷窥同步生效）。<br /><strong>③ 强内核反作弊网游</strong>（无畏契约、三角洲行动等）：建议游玩前右键系统托盘点一下<strong>「暂停监听并隐藏（游戏反作弊护航）」</strong>，彻底卸载钩子保护账号安全。',
      'feat.whaleHeadline': '新皮肤「大肥鱼」登场<br />鲸尾拍键 · 脸红大笑 · 密码捂眼',
      'feat.whaleBody':
        '内置全新 <strong>🐳 大肥鱼（鲸鱼娘）</strong> 桌宠皮肤：支持<strong>左手点鼠标 + 右手敲键盘 + 大鲸尾甩拍自定义按键</strong>三线同时开工；打字手速越快越害羞脸红，飙到高能连打直接笑开花；检测到系统密码输入框时自动<strong>乖巧闭眼、双手捂眼</strong>并隐藏所有键帽与气泡。',
      'feat.kbHeadline': '65% 紧凑或 108 键全尺寸<br />正反双视角，随手切换',
      'feat.kbBody':
        '无论你习惯极简 65% 小键盘，还是财务/工程必备的 108 键完整小键盘，右键一秒切换并自动锚定右下角平滑调整窗口宽度。支持<strong>「面向猫咪（180° 真实视角）」</strong>与<strong>「面向观众（正向字母易读视角）」</strong>双透视重投影，鼠标左右键也同步自动翻转。',
      'feat.mouseHeadline': '左右键独立分色按压<br />还有无感自升级',
      'feat.mouseBody':
        '鼠标左键（<code>L</code>）、右键（<code>R</code>）与中键滚轮彻底独立分区：左键亮起猫咪主强调色，右键呈现高对比珊瑚橙或天蓝色，带 3D 按下内阴影与 <code>LMB</code>/<code>RMB</code> 迷你气泡，支持双键同时按住！内置<strong>国内高速直连优先</strong>的自动更新检测（失败自动回退 GitHub），发现新版本时在猫头上方弹出小巧可关闭的更新胶囊（点 <code>×</code> 永久忽略当前版，下次发版自动再弹），一键完成 SHA-256 校验与静默升级。',
      'mcp.headline': '发张自家猫的照片<br />让 AI 0.4 秒捏进你的桌面',
      'mcp.body':
        'KuroCat 原生内置 <strong>Stdio</strong> 与 <strong>本机 Streamable HTTP（<code>127.0.0.1:27420</code>）</strong> 双模式 MCP 服务端，无需安装 Node.js 或 Python。右键猫咪点「复制 MCP 配置」粘贴进 <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong>，即可用自然语言捏出任何毛色、虎斑、三花、胎记斑块与主题高亮，实时热更新无需重启。',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="https://qianyi.one/">谦一 (Qianyi)</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': '点此输入密码：猫咪自动闭眼 / 大肥鱼捂眼且隐藏按键…',
    },
    titles: {
      'pg.autoDemoTitle': '自动演示打字与鼠标点击',
      'pg.mouseTitle': '演示独立左/右键点击',
      'pg.curiousTitle': '触发逗猫棒好奇大圆瞳（也可快速甩动鼠标自然触发）',
      'pg.crossTitle': '触发飞机耳 + 尾巴三连捶桌（也可乱拍键盘自然触发）',
      'pg.sleepTitle': '触发趴下打瞌睡冒 Zzz（敲任意键抖头醒来）',
      'pg.bubblesTitle': '开关悬浮按键气泡',
      'pg.purrTitle': '开关摸头呼噜声',
      'pg.headphonesTitle': '开关电竞耳机（桌面端支持检测到游戏自动戴上）',
      'pg.orbitTitle': '开启后在画布上拖动可 360° 旋转查看 3D 立体模型',
      'pg.tailSmartTitle': '平时双手打字，两手忙不过来或打完回车时自动出尾',
      'pg.tailCustomTitle': '只拍你亲手勾选的按键',
      'pg.tailEdgeTitle': '近尾外侧边缘区（不拆 WASD）',
      'pg.tailOffTitle': '尾巴只自然摆动，不拍键',
      'pg.tailPickerTitle': '直接在上方键盘点击键帽或敲实体键盘自定义尾巴按键',
      'pg.privacyTitle': '手动切换密码防偷窥演示',
      'pg.scaleResetTitle': '点击重置为 100%',
    },
    ariaLabels: {
      'nav.backAria': '返回谦一主页',
      'nav.mainAria': '主导航',
      'pg.modeAria': '3D / 2D 模式切换',
      'pg.backdropAria': '预览桌布背景',
      'pg.canvas2dAria': 'KuroCat 2D 实时交互试玩画布',
      'pg.canvas3dAria': 'KuroCat 3D 实时交互试玩画布',
      'pg.tailPickerAria': '自定义尾巴按键',
      'pg.skinGroupAria': '选择桌宠皮肤',
      'pg.layoutAria': '键盘配列',
      'pg.orientAria': '键盘视角',
      'pg.collarAria': '3D 项圈铃铛颜色',
      'pg.tailModeAria': '尾巴拍键模式',
      'pg.pwdAria': '密码防偷窥演示输入框',
      'pg.scaleAria': '缩放比例 20% 到 150%',
    },
    alts: {
      'hero.iconAlt': 'KuroCat 图标',
      'feat.kbImgAlt': 'KuroCat 65% 与 108 键全尺寸及双视角对比展示',
      'feat.mouseImgAlt': 'KuroCat 独立鼠标左右键识别与内置新版本提醒展示',
    },
    downloads: {
      'feat.whaleDlFile': 'KuroCat-鲸鱼娘-14s竖屏演示.mp4',
    },
    prompts: {
      'mcp.p1': '帮我用 KuroCat MCP 新增一只英短蓝猫，琥珀色大眼睛、浅灰蓝键盘高亮，并立刻切过去',
      'mcp.p2': '看这张我家猫的照片，用 KuroCat MCP 按它的花色、耳尖和斑块位置给我定制一只专属桌宠！',
      'mcp.p3': '把 KuroCat 缩放到 85%，切换为 108 键全尺寸键盘和面向观众视角',
    },
    skins: {
      black: '小黑猫',
      ragdoll: '布偶猫',
      'orange-tabby': '大橘猫',
      calico: '三花猫',
      tuxedo: '奶牛猫',
      siamese: '暹罗猫',
      dafeiyu: '大肥鱼',
    },
    tailModeShort: {
      smart: '尾巴：智能',
      custom: '尾巴：自定义',
      edge: '尾巴：边缘',
      off: '尾巴：仅摆动',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<你的用户名>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio 模式（Claude / Cursor / Antigravity 通用）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;你的用户名&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio 模式（零依赖直连 App 内置二进制）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// 本机 Streamable HTTP 模式（桌宠运行时直接连接）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `最新版本 ${tag}`,
      heroDownloadWin: (size) => `免费下载 Windows 版（${size}）`,
      heroDownloadMac: (size) => `免费下载 macOS 通用版（${size}）`,
      layout: (id) => (id === '108' ? '108 全尺寸' : '65% 紧凑'),
      orient: (o) => (o === 'viewer' ? '面向观众' : '面向猫咪'),
      tailPickerBtn: (open, count) =>
        open ? `✓ 正在点选（已选 ${count} 键）` : `🐾 点选尾巴按键（${count}）`,
      tailPickerTitleDefault: (count) => `🐾 直接点击下方键帽或敲实体键盘开关（已选 ${count} 键）`,
      tailKeyAdded: (key, count) => `🐾 已加「${key}」· 共 ${count} 键（点完成开始打字测试）`,
      tailKeyRemoved: (key, count) => `🐾 已取消「${key}」· 共 ${count} 键`,
      tailPresetApplied: (preset, count) => {
        const names = { office: '回车空格', rightFn: '方向/小键盘', edgeMods: '外侧功能键' };
        return `🐾 已套用「${names[preset]}」（${count} 键）`;
      },
      tailCleared: () => '🐾 已清空全部尾巴按键（点键帽或敲键添加）',
      autoDemoBtn: (running) => (running ? '⏸ 停止演示' : '▶ 自动演示'),
      privacyBtn: (active) => (active ? '🙈 密码防偷窥中' : '🔒 密码防偷窥'),
      whaleSoundBtn: (muted) => (muted ? '🔇 点此开启音效' : '🔊 音效已开启'),
      copied: () => '已复制 ✓',
      copyConfig: () => '复制配置',
      copyCmd: () => '复制命令',
      copyShort: () => '复制',
      totalDownloads: (count) => `累计下载 ${count} 次`,
      statsUpdated: (timePart) => `更新于 ${timePart} (UTC+8) · 每 30 秒自动刷新`,
    },
  },

  en: {
    htmlLang: 'en',
    docTitle: 'KuroCat — Free Open-Source 3D Desktop Typing Cat & AI Companion | Official Website (Win/Mac/Linux/Android)',
    metaDesc:
      'KuroCat (github.com/qianyiai/kurocat) — Free open-source 3D/2D transparent desktop typing cat & AI coding companion (Bongo Cat alternative) for Windows, macOS (Homebrew), Linux & Android: 6 cats + BigFish, Claude/Codex/DeepSeek status sync, OBS transparent source, password privacy guard & built-in MCP AI studio.',
    text: {
      'nav.back': '← Qianyi',
      'nav.playground': 'Playground',
      'nav.whale': 'BigFish Video',
      'nav.download': 'Download',
      'nav.features': 'Features',
      'nav.mcp': 'AI MCP',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': 'All Platforms',
      'hero.ghSource': 'GitHub Source ›',
      'hero.spec1Lbl': 'Native Rust Installer Size',
      'hero.spec2Val': '7 Skins + MCP',
      'hero.spec2Lbl': 'Cats & Whale-Girl · AI Studio',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': 'Apple Silicon · Win7 · KylinOS',
      'pg.title': 'Live Web Engine · Type or Pet the Cat',
      'pg.mode3d': '✨ 3D Mode',
      'pg.mode2d': '🎨 2D Classic',
      'pg.bgDark': 'Dark Desk',
      'pg.bgLight': 'Light Desk',
      'pg.hintKey': '⌨️ Type',
      'pg.hintMouse': '🖱️ L/R Click',
      'pg.hintPet': '🤚 Pet Head',
      'pg.done': 'Done',
      'pg.presetOffice': 'Enter & Space',
      'pg.presetRightFn': 'Arrows & Numpad',
      'pg.presetEdgeMods': 'Outer Modifiers',
      'pg.presetClear': 'Clear',
      'pg.lblSkin': 'Skin',
      'pg.layout65': '65% Compact',
      'pg.layout108': '108 Full-Size',
      'pg.orientCat': 'Cat View',
      'pg.orientViewer': 'Viewer View',
      'pg.btnMouse': '🖱️ L/R Click',
      'pg.btnCurious': '👀 Curious',
      'pg.btnCross': '💢 Tail Thump',
      'pg.btnSleep': '💤 Sleep',
      'pg.btnBubbles': '💬 Bubbles',
      'pg.btnPurr': '🔊 Purr',
      'pg.btnHeadphones': '🎧 Headset',
      'pg.btnOrbit': '🔄 360° Orbit',
      'pg.lblCollar': '3D Collar',
      'pg.collarNone': 'None',
      'pg.collarRed': '🔴 Red',
      'pg.collarBlue': '🔵 Blue',
      'pg.collarPink': '🩷 Pink',
      'pg.collarGreen': '🟢 Green',
      'pg.lblTail': 'Tail Keys',
      'pg.tailSmart': 'Smart 3rd Hand',
      'pg.tailCustom': 'Custom',
      'pg.tailEdge': 'Edge Only',
      'pg.tailOff': 'Wag Only',
      'pg.lblPwd': 'Password',
      'pg.lblScale': 'Scale',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': 'Free Download — On Your Desk in 3 Seconds',
      'dl.winName': 'Windows 65% Classic Installer',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': 'Recommended',
      'dl.primaryBtn': 'Fast Direct Download',
      'dl.ghBtn': 'GitHub Official Mirror ›',
      'dl.macName': 'macOS Universal (Apple Silicon & Intel)',
      'dl.macSub': 'macOS 10.15+ (Catalina or later) Universal DMG',
      'dl.tipWinTitle': '🛡️ Browser says "isn\'t commonly downloaded" or Windows SmartScreen pops up?',
      'dl.tipBrewTitle': '🍺 Install on macOS via Homebrew (Recommended)',
      'dl.tipMacTitle': '🍎 macOS First-Launch Guide (One-Time Setup)',
      'dl.copyCmd': 'Copy Command',
      'dl.tipWv2Title': '🪟 Seeing "Could not find the WebView2 Runtime" on Windows?',
      'dl.tipWv2Btn': 'Download Microsoft WebView2 Runtime ›',
      'dl.win7Title': '🖥️ Windows 7 SP1 (64-bit) Dedicated Portable (Bundled WebView2 109)',
      'dl.win7Btn': 'Download Win7 Portable (178.99 MB)',
      'dl.win7Gh': 'GitHub Official Mirror (Win7) ›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+ (x86_64 & ARM64)',
      'dl.linuxX64Deb': 'x86_64 .deb (2.39 MB)',
      'dl.linuxArmDeb': 'ARM64 .deb (2.35 MB)',
      'dl.linuxX64AppImage': 'x86_64 AppImage (77.53 MB) ›',
      'dl.linuxArmAppImage': 'ARM64 AppImage (75.70 MB) ›',
      'dl.tipGameTitle': '🎮 Fullscreen Games, OBS Streaming & Anti-Cheat Guide',
      'feat.title': 'Desktop Pet Engineering, Polished to Every Pixel',
      'feat.whaleEyebrow': 'New Skin · 🐳 BigFish (Whale-Girl) · 14s Video',
      'feat.whaleSpec1Val': '3-Limb Sync',
      'feat.whaleSpec1Lbl': 'Mouse + Typing + Tail Slaps',
      'feat.whaleSpec2Val': 'Speed Blush',
      'feat.whaleSpec2Lbl': 'Fast Typing → Shy → Laugh',
      'feat.whaleSpec3Val': 'Hands Cover',
      'feat.whaleSpec3Lbl': 'Auto Password Privacy Shield',
      'feat.whaleTryBtn': 'Try BigFish in Playground ↑',
      'feat.whaleDlBtn': 'Download 1080p Vertical Video (14s)',
      'feat.whaleMeta': '1080×1920 · 60fps · 14s with synced key & mouse audio',
      'feat.kbSpec1Val': '108 Keys',
      'feat.kbSpec1Lbl': 'Full F-Row & Numpad',
      'feat.kbSpec2Val': 'Dual View',
      'feat.kbSpec2Lbl': 'Cat-Facing / Viewer-Facing',
      'feat.kbSpec3Val': 'True Keys',
      'feat.kbSpec3Lbl': 'Distinct Enter vs Num↵',
      'feat.kbTryBtn': 'Try 108-Key Layout Above ↑',
      'feat.mouseSpec1Lbl': 'Independent L / R / Scroll Glow',
      'feat.mouseSpec2Lbl': 'SHA-256 Verified Updates',
      'feat.mouseSpec3Val': '1-Click Update',
      'feat.mouseSpec3Lbl': 'Silent Win & Mac Upgrade',
      'bento.1Title': '2-Tab Zero-Scroll Menu & Persistent Lock',
      'bento.1Body': 'Split into Appearance and Keyboard/OBS/System tabs so everything fits on one screen—plus 20%–150% scaling and persistent click-through lock with a one-click startup Unlock pill.',
      'bento.2Title': 'Head Petting & Synthesized Purr',
      'bento.2Body': 'Hover over the cat’s head and pet back-and-forth to trigger happy squinting eyes and gentle 24.5Hz Web Audio purring.',
      'bento.3Title': 'Auto Password Privacy Guard',
      'bento.3Body': 'Detects Windows & macOS password fields at the OS level—intercepting keystrokes in Rust while cats close their eyes and BigFish covers hers.',
      'bento.4Title': 'Instanced GPU & Game Auto-Eco Mode',
      'bento.4Body': 'Instanced 3D keycap batching and GPU vertex deformation cut active GPU usage by 75%; auto 30 FPS Game Eco Mode cuts it by up to 88.5% while favoring iGPU on laptops.',
      'mcp.p1Text': '💬 "Create a British Shorthair blue cat via KuroCat MCP and switch to it"',
      'mcp.p2Text': '📸 "Look at this photo of my cat and design a matching KuroCat skin!"',
      'mcp.p3Text': '⚙️ "Scale KuroCat to 85% and switch to 108-key viewer perspective"',
      'mcp.copyShort': 'Copy',
      'mcp.tabHttp': 'Local HTTP',
      'mcp.footerMeta': '7 Built-in Tools · 0.4s Live Hot-Reload',
      'mcp.copyCfg': 'Copy Config',
      'growth.eyebrow': 'Live Growth · Real-Time Telemetry',
      'growth.title': 'Live Growth Curve',
      'growth.sub': 'Real-time trajectory of cumulative downloads across all mirrors and GitHub Stars—hover to inspect any timestamp.',
      'growth.dlLbl': 'Total Downloads',
      'growth.starLbl': 'GitHub Stars',
      'growth.modeBoth': 'Both',
      'growth.modeDl': 'Downloads',
      'growth.modeStars': 'Stars',
      'growth.loading': 'Syncing live growth telemetry…',
      'growth.starCta': '⭐ Star KuroCat on GitHub ›',
      'donate.eyebrow': 'Support Open Source · Crypto',
      'donate.title': 'Buy the Cat a Coffee',
      'donate.sub': 'KuroCat is completely free and open-source under the MIT License. If this tiny desktop cat brightened your coding, work, or streams, your support helps keep it maintained and free.',
      'donate.addrLbl': 'ETH / BNB / USDT / USDC · EVM Address',
      'donate.copy': 'Copy Address',
      'footer.home': 'Qianyi Home',
      'footer.pelican': 'Pelican Benchmark',
      'footer.donate': 'Support',
      'footer.releases': 'All Releases',
    },
    html: {
      'hero.title': 'KuroCat — A Typing Black Cat<br /><span>Living on Your Desktop</span>',
      'hero.sub':
        'A free, open-source transparent desktop typing companion with instant <strong>3D / 2D</strong> switching and ultra-low GPU overhead. Includes <strong>6 cats + BigFish</strong>, head-pat purring, password privacy guard, OBS overlay, and <strong>AI cat studio</strong>.',
      'dl.sub':
        'Every build includes <strong>20%–150% smooth scaling</strong>, <strong>65% / 108-key switching</strong>, <strong>customizable tail keys</strong>, and <strong>in-app auto-updates</strong>.<br />Fast CDN mirrors on <code>kurocat.org</code> alongside official GitHub Releases with SHA-256 verification.',
      'dl.winDesc':
        'Starts with the 65% compact layout and adds Desktop, Start Menu & Uninstaller shortcuts. Right-click anytime for <strong>108-key full-size</strong>, <strong>custom tail keys</strong>, OBS source & one-click updates.',
      'dl.macDesc':
        'Native ARM64 + x86_64 Universal DMG supporting Apple Silicon M1–M4 and Intel Macs (macOS 10.15 Catalina+). Includes 65%/108-key layouts, all 6 cats & BigFish. Open <code>.dmg</code> and drag to Applications.',
      'dl.tipWinBody':
        'Because KuroCat is free open-source software without a commercial EV code-signing certificate, Edge/Chrome may show a download warning (100% source code is public on GitHub):<br /><strong>① Edge</strong>: Hover the download → click <strong><code>···</code></strong> → <strong>Keep</strong> → click the down arrow <strong><code>▾</code> (Show more)</strong> → <strong>Keep anyway</strong> (Chrome: press <code>Ctrl + J</code> → Keep dangerous file → Keep anyway).<br /><strong>② Windows SmartScreen</strong>: Click <strong>More info</strong> → <strong>Run anyway</strong>.',
      'dl.tipBrewBody':
        'Official Homebrew Tap (<code>qianyiai/homebrew-tap</code>) is live. Run the command on the right to install and automatically clear quarantine attributes (no manual <code>xattr</code> needed), and update anytime with <code>brew upgrade --cask kurocat</code>.',
      'dl.tipMacBody':
        'Because this open-source app is not Apple-notarized, if macOS says "cannot be verified" or "damaged" on first launch, run the command on the right once in Terminal to remove the quarantine attribute. Then enable <code>KuroCat</code> in <strong>System Settings → Privacy &amp; Security → Accessibility &amp; Input Monitoring</strong> (Karabiner-Elements compatible).',
      'dl.tipWv2Body':
        'Occurs on older stripped Windows 10 / LTSC installs without Microsoft Edge WebView2 (<strong>Windows 7 users should use the Win7 Portable pack below</strong>). Install the official 1.8 MB Microsoft WebView2 bootstrapper via <strong>Right-click → Run as administrator</strong>.',
      'dl.win7Body':
        'Compiled natively as PE 6.01 for Windows 7 SP1 x64 with zero Win8/Win10 DLL dependencies. Bundles Microsoft’s final Win7 offline <strong>WebView2 109.0.1518.78</strong> runtime and native 256-level per-pixel anti-aliased transparency (zero white box with or without Aero). Extract all files and run <code>KuroCat.exe</code> next to <code>WebView2Runtime</code>.',
      'dl.linuxBody':
        'Native rootless X11 <code>XRecord</code> global hooks with Wayland <code>evdev</code> fallback, borderless transparency, click-through (hold <code>Alt</code> to drag) & autostart. Requires <strong><code>glibc &gt;= 2.34</code></strong> (Ubuntu 22.04+ / Debian 12+ / KylinOS V11+; not compatible with Ubuntu 20.04 / <code>glibc 2.31</code>). Use lightweight <strong>.deb (2.4 MB)</strong> (requires <code>libwebkit2gtk-4.1-0</code>) or portable <strong>.AppImage</strong>.',
      'dl.tipGameBody':
        '<strong>① Fullscreen &amp; Borderless Games</strong>: Built-in non-focus-stealing topmost guard for FSO &amp; borderless windows; enable Click-Through Lock (hold <code>Alt</code> anytime to move). For admin games, use tray → <strong>Restart as Administrator</strong>.<br /><strong>② OBS Streaming (Zero Chroma-Key)</strong>: Right-click pet or tray → <strong>Copy OBS Transparent Source URL</strong> (starts local <code>http://127.0.0.1:27421/obs</code>, off by default with zero overhead) and add as an OBS Browser Source for native Alpha transparency + OBS-Only mode + synced password guard.<br /><strong>③ Kernel Anti-Cheat Games</strong> (Valorant, etc.): Use tray → <strong>Pause Hook &amp; Hide (Anti-Cheat Safe Mode)</strong> before launching to fully unload global hooks.',
      'feat.whaleHeadline': 'Meet "BigFish" Whale-Girl<br />Tail Slaps · Speed Blush · Privacy Shield',
      'feat.whaleBody':
        'Our built-in <strong>🐳 BigFish (whale-girl)</strong> skin supports simultaneous <strong>left-hand mouse + right-hand typing + splashing whale-tail key slaps</strong>. Type faster to make her blush and burst into a happy smile; focus any password field and she covers her eyes with both hands while hiding every keycap.',
      'feat.kbHeadline': '65% Compact or 108 Full-Size<br />Dual Perspectives, Instant Switch',
      'feat.kbBody':
        'Switch in one click between minimal 65% and full 108-key ANSI (complete F-row &amp; numpad) with smooth bottom-right anchored resizing. Flip between <strong>Cat-Facing (180°)</strong> and <strong>Viewer-Facing (upright legends)</strong> with synchronized mouse button orientation.',
      'feat.mouseHeadline': 'Independent L / R Click Colors<br />&amp; Seamless In-App Auto-Updater',
      'feat.mouseBody':
        'Left (<code>L</code>), Right (<code>R</code>), and scroll/middle clicks glow independently with contrasting accent colors, 3D pressed shadows, and mini <code>LMB</code>/<code>RMB</code> badges—supporting dual-button holds. Fast CDN-first update checks (with GitHub fallback) pop a compact dismissible update pill above the pet for SHA-256 verified one-click upgrades.',
      'mcp.headline': 'Share a Photo of Your Cat<br />AI Sculpts It in 0.4 Seconds',
      'mcp.body':
        'KuroCat ships with both <strong>Stdio</strong> and <strong>Local Streamable HTTP (<code>127.0.0.1:27420</code>)</strong> MCP servers inside the single binary—no Node.js or Python needed. Click "Copy MCP Config" and paste into <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong> to design any coat, tabby stripes, calico patches, or eye colors with instant hot-reload.',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="https://qianyi.one/?lang=en">Qianyi</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': 'Type a password here: cat closes eyes / BigFish covers eyes & hides keys…',
    },
    titles: {
      'pg.autoDemoTitle': 'Toggle automatic typing & mouse demo',
      'pg.mouseTitle': 'Demo independent L/R mouse clicks',
      'pg.curiousTitle': 'Trigger curious wide pupils (or flick cursor quickly)',
      'pg.crossTitle': 'Trigger airplane ears + 3-beat tail desk-thump (or mash keys)',
      'pg.sleepTitle': 'Trigger sleepy loaf with floating Zzz (press any key to wake)',
      'pg.bubblesTitle': 'Toggle floating keycap bubbles',
      'pg.purrTitle': 'Toggle petting purr sound',
      'pg.headphonesTitle': 'Toggle gaming headset (desktop app auto-equips when a game is detected)',
      'pg.orbitTitle': 'Enable to drag on the canvas and rotate the 3D model 360°',
      'pg.tailSmartTitle': 'Paws type normally; tail assists as a 3rd hand when busy or on fast Enter',
      'pg.tailCustomTitle': 'Tail taps only the keys you select',
      'pg.tailEdgeTitle': 'Outer tail-side edge keys only (protects WASD)',
      'pg.tailOffTitle': 'Tail wags naturally without pressing keys',
      'pg.tailPickerTitle': 'Click keycaps on the keyboard above or press physical keys to toggle',
      'pg.privacyTitle': 'Toggle password privacy guard demo',
      'pg.scaleResetTitle': 'Click to reset to 100%',
    },
    ariaLabels: {
      'nav.backAria': 'Back to Qianyi home',
      'nav.mainAria': 'Main navigation',
      'pg.modeAria': '3D / 2D render mode',
      'pg.backdropAria': 'Preview desk backdrop',
      'pg.canvas2dAria': 'KuroCat 2D live interactive playground canvas',
      'pg.canvas3dAria': 'KuroCat 3D live interactive playground canvas',
      'pg.tailPickerAria': 'Customize tail keys',
      'pg.skinGroupAria': 'Choose pet skin',
      'pg.layoutAria': 'Keyboard layout',
      'pg.orientAria': 'Keyboard perspective',
      'pg.collarAria': '3D collar and bell color',
      'pg.tailModeAria': 'Tail key-patting mode',
      'pg.pwdAria': 'Password privacy guard demo input',
      'pg.scaleAria': 'Scale from 20% to 150%',
    },
    alts: {
      'hero.iconAlt': 'KuroCat app icon',
      'feat.kbImgAlt': 'KuroCat 65% compact vs 108-key full-size and dual perspective showcase',
      'feat.mouseImgAlt': 'KuroCat independent L/R mouse highlights and in-app auto-updater showcase',
    },
    downloads: {
      'feat.whaleDlFile': 'KuroCat-BigFish-14s-Vertical-Demo.mp4',
    },
    prompts: {
      'mcp.p1': 'Use KuroCat MCP to create a British Shorthair blue cat with amber eyes and ice-blue keycaps, and switch to it now',
      'mcp.p2': 'Look at this photo of my cat and design a custom KuroCat desktop pet matching its fur pattern and markings!',
      'mcp.p3': 'Scale KuroCat to 85% and switch to the 108-key full-size viewer-facing keyboard',
    },
    skins: {
      black: 'Black Cat',
      ragdoll: 'Ragdoll',
      'orange-tabby': 'Orange Tabby',
      calico: 'Calico',
      tuxedo: 'Tuxedo',
      siamese: 'Siamese',
      dafeiyu: 'BigFish',
    },
    tailModeShort: {
      smart: 'Tail: Smart',
      custom: 'Tail: Custom',
      edge: 'Tail: Edge',
      off: 'Tail: Wag Only',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<YourUsername>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio Mode (Claude / Cursor / Antigravity)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;YourUsername&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio Mode (zero dependencies, built into app binary)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// Local Streamable HTTP Mode (connect while KuroCat is running)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `Latest ${tag}`,
      heroDownloadWin: (size) => `Download for Windows (${size})`,
      heroDownloadMac: (size) => `Download for macOS (${size})`,
      layout: (id) => (id === '108' ? '108 Full-Size' : '65% Compact'),
      orient: (o) => (o === 'viewer' ? 'Viewer View' : 'Cat View'),
      tailPickerBtn: (open, count) =>
        open ? `✓ Picking (${count} selected)` : `🐾 Pick Tail Keys (${count})`,
      tailPickerTitleDefault: (count) => `🐾 Click keycaps below or press physical keys (${count} selected)`,
      tailKeyAdded: (key, count) => `🐾 Added "${key}" · ${count} keys (click Done to test)`,
      tailKeyRemoved: (key, count) => `🐾 Removed "${key}" · ${count} keys`,
      tailPresetApplied: (preset, count) => {
        const names = { office: 'Enter & Space', rightFn: 'Arrows & Numpad', edgeMods: 'Outer Modifiers' };
        return `🐾 Applied "${names[preset]}" (${count} keys)`;
      },
      tailCleared: () => '🐾 Cleared all tail keys (click keycaps or press keys to add)',
      autoDemoBtn: (running) => (running ? '⏸ Stop Demo' : '▶ Auto Demo'),
      privacyBtn: (active) => (active ? '🙈 Privacy Active' : '🔒 Privacy Guard'),
      whaleSoundBtn: (muted) => (muted ? '🔇 Unmute Audio' : '🔊 Audio On'),
      copied: () => 'Copied ✓',
      copyConfig: () => 'Copy Config',
      copyCmd: () => 'Copy Command',
      copyShort: () => 'Copy',
      totalDownloads: (count) => `${count} total downloads`,
      statsUpdated: (timePart) => `Updated ${timePart} (UTC+8) · auto-refreshes every 30s`,
    },
  },

  ja: {
    htmlLang: 'ja',
    docTitle: 'KuroCat — 無料オープンソース 3D デスクトップタイピング黒猫 & AI コンパニオン | 公式サイト (Win/Mac/Linux/Android)',
    metaDesc:
      'KuroCat (github.com/qianyiai/kurocat) — Windows / macOS (Homebrew) / Linux / Android 対応の無料オープンソース 3D/2D 透過デスクトップタイピング黒猫＆AI コーディングコンパニオン（Bongo Cat 代替）。猫 6 種＋クジラ娘、Claude/Codex/DeepSeek 連携、OBS 透過ソース、パスワード保護、内蔵 MCP AI カスタム対応。',
    text: {
      'nav.back': '← 謙一',
      'nav.playground': '体験版',
      'nav.whale': 'クジラ娘動画',
      'nav.download': 'ダウンロード',
      'nav.features': '主な機能',
      'nav.mcp': 'AI カスタム',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': '全プラットフォーム',
      'hero.ghSource': 'GitHub ソース ›',
      'hero.spec1Lbl': 'Rust ネイティブ導入サイズ',
      'hero.spec2Val': '7 種 + MCP',
      'hero.spec2Lbl': '猫 & クジラ娘 · AI 制作',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': 'Apple Silicon · Win7 · KylinOS',
      'pg.title': 'リアルタイム体験版 · 打鍵やなでなでに対応',
      'pg.mode3d': '✨ 3D モード',
      'pg.mode2d': '🎨 2D クラシック',
      'pg.bgDark': 'ダーク壁紙',
      'pg.bgLight': 'ライト壁紙',
      'pg.hintKey': '⌨️ キー入力',
      'pg.hintMouse': '🖱️ 左右クリック',
      'pg.hintPet': '🤚 頭をなでる',
      'pg.done': '完了',
      'pg.presetOffice': 'Enter・Space',
      'pg.presetRightFn': '方向・テンキー',
      'pg.presetEdgeMods': '外側修飾キー',
      'pg.presetClear': 'クリア',
      'pg.lblSkin': 'スキン',
      'pg.layout65': '65% コンパクト',
      'pg.layout108': '108 フルサイズ',
      'pg.orientCat': '猫目線',
      'pg.orientViewer': '視聴者目線',
      'pg.btnMouse': '🖱️ 左右クリック',
      'pg.btnCurious': '👀 好奇心',
      'pg.btnCross': '💢 しっぽ叩き',
      'pg.btnSleep': '💤 うたた寝',
      'pg.btnBubbles': '💬 バブル',
      'pg.btnPurr': '🔊 ゴロゴロ',
      'pg.btnHeadphones': '🎧 ヘッドセット',
      'pg.btnOrbit': '🔄 360° 回転',
      'pg.lblCollar': '3D 首輪',
      'pg.collarNone': 'なし',
      'pg.collarRed': '🔴 赤',
      'pg.collarBlue': '🔵 青',
      'pg.collarPink': '🩷 ピンク',
      'pg.collarGreen': '🟢 緑',
      'pg.lblTail': 'しっぽ打鍵',
      'pg.tailSmart': 'スマート第3の手',
      'pg.tailCustom': 'カスタム',
      'pg.tailEdge': '端エリア',
      'pg.tailOff': '揺らすだけ',
      'pg.lblPwd': 'パスワード',
      'pg.lblScale': '拡大縮小',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': '無料ダウンロード、3 秒でデスクにお迎え',
      'dl.winName': 'Windows 65% インストーラー版',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': 'おすすめ',
      'dl.primaryBtn': '高速ダイレクトDL',
      'dl.ghBtn': 'GitHub 公式ミラー ›',
      'dl.macName': 'macOS ユニバーサル版（M チップ & Intel）',
      'dl.macSub': 'macOS 10.15+ (Catalina 以降) Universal DMG',
      'dl.tipWinTitle': '🛡️ ブラウザのダウンロード警告や SmartScreen が表示されたら？',
      'dl.tipBrewTitle': '🍺 macOS Homebrew ワンラインインストール（推奨・自動検疫解除）',
      'dl.tipMacTitle': '🍎 macOS 初回起動ガイド（初回のみ・常時ターミナル不要）',
      'dl.copyCmd': 'コマンドをコピー',
      'dl.tipWv2Title': '🪟 Windows で「Could not find the WebView2 Runtime」が出たら？',
      'dl.tipWv2Btn': 'Microsoft WebView2 をダウンロード ›',
      'dl.win7Title': '🖥️ Windows 7 SP1（64bit）専用ポータブル版（WebView2 109 同梱）',
      'dl.win7Btn': 'Win7 ポータブル版をダウンロード（178.99 MB）',
      'dl.win7Gh': 'GitHub 公式ミラー（Win7 版）›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+（x86_64 & ARM64）',
      'dl.linuxX64Deb': 'x86_64 .deb（2.39 MB）',
      'dl.linuxArmDeb': 'ARM64 .deb（2.35 MB）',
      'dl.linuxX64AppImage': 'x86_64 AppImage（77.53 MB）›',
      'dl.linuxArmAppImage': 'ARM64 AppImage（75.70 MB）›',
      'dl.tipGameTitle': '🎮 フルスクリーンゲーム・OBS 配信・アンチチート案内',
      'feat.title': '1 ピクセルまでこだわり抜いた滑らかさ',
      'feat.whaleEyebrow': 'New Skin · 🐳 クジラ娘（BigFish）· 14s Video',
      'feat.whaleSpec1Val': '3 系統同時動作',
      'feat.whaleSpec1Lbl': 'マウス + 手打ち + クジラ尾',
      'feat.whaleSpec2Val': '速度連動',
      'feat.whaleSpec2Lbl': '高速打鍵で照れ顔 → 満面笑顔',
      'feat.whaleSpec3Val': '自動目隠し',
      'feat.whaleSpec3Lbl': 'パスワード入力を両手で保護',
      'feat.whaleTryBtn': '上の体験版でクジラ娘を試す ↑',
      'feat.whaleDlBtn': '1080p 縦型デモ動画を保存（14秒）',
      'feat.whaleMeta': '1080×1920 · 60fps · 14秒 同期打鍵＆クリック音付き',
      'feat.kbSpec1Val': '108 キー',
      'feat.kbSpec1Lbl': 'F 列＆テンキー完全搭載',
      'feat.kbSpec2Val': '2 視点切替',
      'feat.kbSpec2Lbl': '猫目線 / 視聴者目線',
      'feat.kbSpec3Val': '完全識別',
      'feat.kbSpec3Lbl': 'メイン Enter と Num↵ を独立認識',
      'feat.kbTryBtn': '上の体験版で 108 キーを試す ↑',
      'feat.mouseSpec1Lbl': '左右中クリック完全独立発光',
      'feat.mouseSpec2Lbl': 'SHA-256 自動検証更新',
      'feat.mouseSpec3Val': '1 クリック更新',
      'feat.mouseSpec3Lbl': 'Win / Mac 自動再起動アップデート',
      'bento.1Title': '2 タブ式スクロール不要メニュー & 透過ロック記憶',
      'bento.1Body': '「外観と操作 / キーボード・OBS・システム」の 2 タブで 1 画面完結。20%–150% ズーム対応＆再起動後もクリック透過を維持し、起動時ワンクリック解除バー付き。',
      'bento.2Title': 'なでなで細目 & 合成ゴロゴロ音',
      'bento.2Body': '猫の頭を往復でなでると気持ちよさそうに目を細め、Web Audio 24.5Hz 合成のやさしいゴロゴロ音が鳴ります。',
      'bento.3Title': 'パスワード自動目隠し保護',
      'bento.3Body': 'Windows / macOS のパスワード欄を自動検知し Rust 層で打鍵を遮断。猫は目を閉じ、クジラ娘は両手で目を覆います。',
      'bento.4Title': 'GPU インスタンス描画 & ゲーム自動省電力',
      'bento.4Body': '3D キーキャップのインスタンス統合と GPU 頂点変形でアクティブ時 GPU 負荷 75% 削減。ゲーム起動中は自動で 30 FPS 省電力（最大 88.5% 削減）へ切替。',
      'mcp.p1Text': '💬 「KuroCat MCP でブリティッシュショートヘアを作って切り替えて」',
      'mcp.p2Text': '📸 「うちの猫の写真に合わせて専用ペットを作って！」',
      'mcp.p3Text': '⚙️ 「85% に縮小して 108 キー・視聴者目線に切り替えて」',
      'mcp.copyShort': 'コピー',
      'mcp.tabHttp': 'ローカル HTTP',
      'mcp.footerMeta': '内蔵 7 ツール対応 · 0.4 秒ホットリロード',
      'mcp.copyCfg': '設定をコピー',
      'growth.eyebrow': 'Live Growth · Real-Time Telemetry',
      'growth.title': 'リアルタイム成長グラフ',
      'growth.sub': '全チャネル累計ダウンロード数と GitHub Stars の推移をリアルタイム表示。グラフ上でカーソルを動かすと詳細を確認できます。',
      'growth.dlLbl': '累計ダウンロード',
      'growth.starLbl': 'GitHub Stars',
      'growth.modeBoth': '2 軸表示',
      'growth.modeDl': 'DL のみ',
      'growth.modeStars': 'Stars のみ',
      'growth.loading': 'リアルタイム統計を読み込み中…',
      'growth.starCta': '⭐ GitHub でスターを付ける ›',
      'donate.eyebrow': 'Support Open Source · Crypto',
      'donate.title': '黒猫にコーヒーを一杯',
      'donate.sub': 'KuroCat は MIT ライセンスで完全無料・オープンソース公開しています。作業や配信のお供として気に入っていただけたら、継続的な開発・無料配布の応援をいただけると励みになります。',
      'donate.addrLbl': 'ETH / BNB / USDT / USDC · EVM 共通アドレス',
      'donate.copy': 'アドレスをコピー',
      'footer.home': '謙一ホーム',
      'footer.pelican': 'ペリカンテスト',
      'footer.donate': '開発を支援',
      'footer.releases': '全リリース (Releases)',
    },
    html: {
      'hero.title': 'KuroCat · キーボードを叩く黒猫が<br /><span>あなたのデスクトップに</span>',
      'hero.sub':
        '無料・オープンソースの透過デスクトップ相棒。<strong>3D / 2D</strong> をワンクリックで切替でき、ゲーム中も超低負荷で動作します。<strong>猫 6 種 + クジラ娘</strong>、なでなでゴロゴロ、パスワード自動保護、OBS 透過配信、<strong>AI カスタム猫</strong> に対応。',
      'dl.sub':
        '全パッケージに <strong>20%–150% 無段階ズーム</strong>・<strong>65% / 108 キー切替</strong>・<strong>しっぽキー選択</strong>・<strong>アプリ内自動更新</strong> を内蔵。<br /><code>kurocat.org</code> 高速ミラーと GitHub Releases 公式リンク（SHA-256 検証対応）を用意しています。',
      'dl.winDesc':
        '初期配列は 65% コンパクト。デスクトップアイコンやアンインストーラーを自動作成し、右クリックから <strong>108 フルサイズ</strong>・<strong>しっぽキー指定</strong>・OBS 透過ソース・自動更新へいつでも切替できます。',
      'dl.macDesc':
        'Apple Silicon (M1–M4) と Intel Mac（macOS 10.15 Catalina 以降）両対応の Universal DMG。65%/108 キーと全 7 スキンを内蔵。<code>.dmg</code> を開いて「アプリケーション」へドラッグするだけです。',
      'dl.tipWinBody':
        '無料オープンソースで商用コード署名がないため、ダウンロード時に警告が表示される場合があります（全ソースコードは GitHub で公開済み）：<br /><strong>① Edge</strong>：履歴にカーソルを合わせ <strong><code>···</code></strong> → <strong>保存</strong> → <strong><code>▾</code>（詳細表示）</strong> → <strong>保持する</strong>（Chrome は <code>Ctrl + J</code> → 危険なファイルを保存 → 保持）。<br /><strong>② SmartScreen の青い画面</strong>：<strong>詳細情報</strong> → <strong>実行</strong> をクリックしてください。',
      'dl.tipBrewBody':
        '公式 Homebrew Tap（<code>qianyiai/homebrew-tap</code>）を公開しました。右のコマンド 1 行で導入でき、検疫属性も自動解除されます（手動 <code>xattr</code> 不要）。以降は <code>brew upgrade --cask kurocat</code> で簡単に更新できます。',
      'dl.tipMacBody':
        '未公証アプリのため初回起動時に「開発元を確認できない」等と出た場合は、ターミナルで右のコマンドを一度だけ実行して隔離属性を解除してください。その後、<strong>システム設定 → プライバシーとセキュリティ</strong> で <strong>アクセシビリティ</strong> と <strong>入力監視</strong> の両方に <code>KuroCat</code> を許可すれば即時動作します（Karabiner-Elements 併用可）。',
      'dl.tipWv2Body':
        '古い Win10 / LTSC 環境で WebView2 が未導入の場合に表示されます（<strong>Windows 7 は下の専用ポータブル版をご利用ください</strong>）。右の Microsoft 公式 1.8 MB インストーラーを <strong>右クリック → 管理者として実行</strong> で導入してください。',
      'dl.win7Body':
        'Windows 7 SP1 64bit 専用 PE 6.01 ネイティブビルド。Win7 最終版オフライン <strong>WebView2 109.0.1518.78</strong> を同梱し、Aero 有無を問わず白枠ゼロの 256 段階透過レンダリングを実現。すべて展開し <code>KuroCat.exe</code> と <code>WebView2Runtime</code> を同フォルダで起動してください。',
      'dl.linuxBody':
        'root 不要の X11 <code>XRecord</code> 監視と Wayland <code>evdev</code> フォールバック、透過最前面・クリック透過（<code>Alt</code> ドラッグ）・自動起動に対応。<strong><code>glibc &gt;= 2.34</code></strong>（Ubuntu 22.04+ / Debian 12+ / KylinOS V11+）が必要です。軽量な <strong>.deb（2.4 MB）</strong>（要 <code>libwebkit2gtk-4.1-0</code>）または <strong>.AppImage</strong> をお選びください。',
      'dl.tipGameBody':
        '<strong>① フルスクリーン＆ボーダレスゲーム</strong>：フォーカスを奪わない最前面ガードを内蔵（マウス透過ロック＋<code>Alt</code> 一時解除推奨）。管理者権限ゲームではトレイから <strong>管理者として再起動</strong> できます。<br /><strong>② OBS 透過配信（クロマキー不要）</strong>：右クリックまたはトレイから <strong>OBS 透過ソース URL をコピー</strong>（<code>http://127.0.0.1:27421/obs</code>、初期 OFF で負荷ゼロ）。OBS のブラウザソースに追加するだけで透過表示＆「OBS のみ表示」＆パスワード保護連動に対応します。<br /><strong>③ カーネル型アンチチート搭載ゲーム</strong>（VALORANT 等）：プレイ前にトレイの <strong>監視を一時停止して非表示</strong> をオンにすると安全にフックを解除できます。',
      'feat.whaleHeadline': '新スキン「クジラ娘」登場<br />クジラ尾打鍵・照れ笑顔・パスワード目隠し',
      'feat.whaleBody':
        '標準搭載の <strong>🐳 クジラ娘（BigFish）</strong> は <strong>左手マウス + 右手タイピング + 水しぶき付きクジラ尾打鍵</strong> の 3 系統同時動作に対応。高速タイピングで頬が染まり満面の笑顔に、パスワード入力時は両手で目を覆って入力を隠します。',
      'feat.kbHeadline': '65% コンパクト / 108 フルサイズ<br />2 視点をワンクリック切替',
      'feat.kbBody':
        '省スペースな 65% もテンキー完備の 108 キーも右クリック 1 秒で切替でき、右下基準でウィンドウ幅を自動調整。<strong>猫目線（180°）</strong> と <strong>視聴者目線（正立印字）</strong> に合わせてマウス左右ボタンも自動反転します。',
      'feat.mouseHeadline': '左右クリックを別カラーで発光<br />アプリ内ワンクリック自動更新',
      'feat.mouseBody':
        '左（<code>L</code>）・右（<code>R</code>）・中/ホイールをコントラスト配色と 3D 影、ミニ <code>LMB</code>/<code>RMB</code> バッジで明確に識別（同時押し対応）。高速 CDN 優先（GitHub フォールバック）の自動更新チェックにより、新バージョン配信時はペット頭上に閉じられる小型更新ピルを表示し、SHA-256 検証付きでシームレスに更新できます。',
      'mcp.headline': '愛猫の写真から<br />AI が 0.4 秒でデスクトップへ再現',
      'mcp.body':
        'Node.js も Python も不要。単体アプリに <strong>Stdio</strong> と <strong>ローカル Streamable HTTP（<code>127.0.0.1:27420</code>）</strong> MCP サーバーを内蔵しています。右クリック「MCP 設定をコピー」を <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong> に貼るだけで、毛色や柄・瞳の色を自然言語で自由作成できます。',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="https://qianyi.one/?lang=ja">謙一 (Qianyi)</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': 'ここにパスワードを入力：猫は目閉じ / クジラ娘は両手で目隠し…',
    },
    titles: {
      'pg.autoDemoTitle': '自動タイピング＆クリックデモの切替',
      'pg.mouseTitle': '左右独立クリックのデモ',
      'pg.curiousTitle': '好奇心のまん丸瞳をトリガー（素早いマウス移動でも発動）',
      'pg.crossTitle': 'イカ耳＋しっぽ 3 連机叩きをトリガー（連打でも発動）',
      'pg.sleepTitle': '香箱座りうたた寝 Zzz をトリガー（キー入力で起床）',
      'pg.bubblesTitle': 'キーバブル表示のオン/オフ',
      'pg.purrTitle': 'なでなでゴロゴロ音のオン/オフ',
      'pg.headphonesTitle': 'ゲーミングヘッドセットのオン/オフ（デスクトップ版はゲーム起動時に自動装着）',
      'pg.orbitTitle': 'オンにするとキャンバス上をドラッグして 3D モデルを 360° 回転できます',
      'pg.tailSmartTitle': '通常は両前足で打ち、忙しい時や高速 Enter でしっぽが自動補佐',
      'pg.tailCustomTitle': '自分で選んだキーだけしっぽで叩く',
      'pg.tailEdgeTitle': 'しっぽ側の外側端キーのみ（WASD 保護）',
      'pg.tailOffTitle': 'しっぽは自然に揺らすだけ（キーは叩かない）',
      'pg.tailPickerTitle': '上のキーボードをクリック、または実キーボードを押してしっぽキーを選択',
      'pg.privacyTitle': 'パスワード自動目隠しデモを切替',
      'pg.scaleResetTitle': 'クリックで 100% にリセット',
    },
    ariaLabels: {
      'nav.backAria': '謙一ホームへ戻る',
      'nav.mainAria': 'メインナビゲーション',
      'pg.modeAria': '3D / 2D 表示モード切替',
      'pg.backdropAria': 'プレビュー背景切替',
      'pg.canvas2dAria': 'KuroCat 2D リアルタイム体験キャンバス',
      'pg.canvas3dAria': 'KuroCat 3D リアルタイム体験キャンバス',
      'pg.tailPickerAria': 'しっぽキーのカスタム設定',
      'pg.skinGroupAria': 'ペットスキンを選択',
      'pg.layoutAria': 'キーボード配列',
      'pg.orientAria': 'キーボード視点',
      'pg.collarAria': '3D 首輪と鈴のカラー',
      'pg.tailModeAria': 'しっぽ打鍵モード',
      'pg.pwdAria': 'パスワード自動保護デモ入力欄',
      'pg.scaleAria': '拡大縮小 20%〜150%',
    },
    alts: {
      'hero.iconAlt': 'KuroCat アプリアイコン',
      'feat.kbImgAlt': 'KuroCat 65% コンパクト・108 フルサイズおよび 2 視点比較プレビュー',
      'feat.mouseImgAlt': 'KuroCat マウス左右独立ハイライトとアプリ内自動更新プレビュー',
    },
    downloads: {
      'feat.whaleDlFile': 'KuroCat-クジラ娘-14秒縦型デモ.mp4',
    },
    prompts: {
      'mcp.p1': 'KuroCat MCP を使って、琥珀色の瞳とアイスブルーのキーハイライトを持つブリティッシュショートヘアを作ってすぐ切り替えて',
      'mcp.p2': 'このうちの猫の写真を見て、KuroCat MCP で毛色と模様を再現した専用デスクトップペットを作って！',
      'mcp.p3': 'KuroCat を 85% に縮小して、108 キー・視聴者目線に切り替えて',
    },
    skins: {
      black: '黒猫',
      ragdoll: 'ラグドール',
      'orange-tabby': '茶トラ',
      calico: '三毛猫',
      tuxedo: 'ハチワレ',
      siamese: 'シャム猫',
      dafeiyu: 'クジラ娘',
    },
    tailModeShort: {
      smart: 'しっぽ：スマート',
      custom: 'しっぽ：カスタム',
      edge: 'しっぽ：端のみ',
      off: 'しっぽ：揺れのみ',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<ユーザー名>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio モード（Claude / Cursor / Antigravity 共通）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;ユーザー名&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio モード（外部依存なし・アプリ内蔵バイナリ直結）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// ローカル Streamable HTTP モード（KuroCat 起動中に直接接続）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `最新版 ${tag}`,
      heroDownloadWin: (size) => `Windows 版を無料ダウンロード（${size}）`,
      heroDownloadMac: (size) => `macOS 版を無料ダウンロード（${size}）`,
      layout: (id) => (id === '108' ? '108 フルサイズ' : '65% コンパクト'),
      orient: (o) => (o === 'viewer' ? '視聴者目線' : '猫目線'),
      tailPickerBtn: (open, count) =>
        open ? `✓ 選択中（${count} キー）` : `🐾 しっぽキー選択（${count}）`,
      tailPickerTitleDefault: (count) => `🐾 下のキーをクリック、または実キーボードで切替（${count} キー選択中）`,
      tailKeyAdded: (key, count) => `🐾 「${key}」を追加・計 ${count} キー（完了でテスト）`,
      tailKeyRemoved: (key, count) => `🐾 「${key}」を解除・計 ${count} キー`,
      tailPresetApplied: (preset, count) => {
        const names = { office: 'Enter・Space', rightFn: '方向・テンキー', edgeMods: '外側修飾キー' };
        return `🐾 「${names[preset]}」を適用（${count} キー）`;
      },
      tailCleared: () => '🐾 しっぽキーをすべてクリアしました（キーを押して追加）',
      autoDemoBtn: (running) => (running ? '⏸ デモ停止' : '▶ 自動デモ'),
      privacyBtn: (active) => (active ? '🙈 目隠し保護中' : '🔒 パスワード保護'),
      whaleSoundBtn: (muted) => (muted ? '🔇 音声をオン' : '🔊 音声オン'),
      copied: () => 'コピー済み ✓',
      copyConfig: () => '設定をコピー',
      copyCmd: () => 'コマンドをコピー',
      copyShort: () => 'コピー',
      totalDownloads: (count) => `累計 ${count} ダウンロード`,
      statsUpdated: (timePart) => `${timePart} (UTC+8) 更新 · 30 秒ごとに自動更新`,
    },
  },

  ko: {
    htmlLang: 'ko',
    docTitle: 'KuroCat — 무료 오픈소스 3D 바탕화면 타이핑 검은 고양이 & AI 컴패니언 | 공식 웹사이트 (Win/Mac/Linux/Android)',
    metaDesc:
      'KuroCat (github.com/qianyiai/kurocat) — Windows, macOS (Homebrew), Linux, Android를 지원하는 무료 오픈소스 3D/2D 투명 바탕화면 타이핑 검은 고양이 & AI 코딩 컴패니언(Bongo Cat 대안). 고양이 6종 + 고래소녀, Claude/Codex/DeepSeek 연동, OBS 투명 소스, 비밀번호 자동 눈 가리기, 내장 MCP AI 커스텀 지원.',
    text: {
      'nav.back': '← Qianyi',
      'nav.playground': '체험판',
      'nav.whale': '고래소녀 영상',
      'nav.download': '다운로드',
      'nav.features': '핵심 기능',
      'nav.mcp': 'AI 커스텀',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': '전체 플랫폼',
      'hero.ghSource': 'GitHub 소스 ›',
      'hero.spec1Lbl': '네이티브 Rust 설치 용량',
      'hero.spec2Val': '7종 + MCP',
      'hero.spec2Lbl': '고양이 & 고래소녀 · AI 제작',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': 'Apple Silicon · Win7 · KylinOS',
      'pg.title': '실시간 체험 · 타이핑 & 쓰다듬기',
      'pg.mode3d': '✨ 3D 모드',
      'pg.mode2d': '🎨 2D 클래식',
      'pg.bgDark': '다크 배경',
      'pg.bgLight': '라이트 배경',
      'pg.hintKey': '⌨️ 키 입력',
      'pg.hintMouse': '🖱️ 좌/우 클릭',
      'pg.hintPet': '🤚 머리 쓰다듬기',
      'pg.done': '완료',
      'pg.presetOffice': 'Enter·Space',
      'pg.presetRightFn': '방향키·넘패드',
      'pg.presetEdgeMods': '우측 기능키',
      'pg.presetClear': '초기화',
      'pg.lblSkin': '스킨',
      'pg.layout65': '65% 콤팩트',
      'pg.layout108': '108 풀배열',
      'pg.orientCat': '고양이 시점',
      'pg.orientViewer': '시청자 시점',
      'pg.btnMouse': '🖱️ 좌/우 클릭',
      'pg.btnCurious': '👀 호기심',
      'pg.btnCross': '💢 꼬리 쿵',
      'pg.btnSleep': '💤 졸기',
      'pg.btnBubbles': '💬 말풍선',
      'pg.btnPurr': '🔊 골골송',
      'pg.btnHeadphones': '🎧 헤드셋',
      'pg.btnOrbit': '🔄 360° 회전',
      'pg.lblCollar': '3D 목걸이',
      'pg.collarNone': '없음',
      'pg.collarRed': '🔴 빨강',
      'pg.collarBlue': '🔵 파랑',
      'pg.collarPink': '🩷 분홍',
      'pg.collarGreen': '🟢 초록',
      'pg.lblTail': '꼬리 타건',
      'pg.tailSmart': '스마트 보조',
      'pg.tailCustom': '커스텀',
      'pg.tailEdge': '가장자리',
      'pg.tailOff': '흔들기만',
      'pg.lblPwd': '비밀번호',
      'pg.lblScale': '크기 조절',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': '무료 다운로드 · 3초 만에 시작하기',
      'dl.winName': 'Windows 65% 클래식 설치판',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': '추천',
      'dl.primaryBtn': '고속 직접 다운로드',
      'dl.ghBtn': 'GitHub 공식 미러 ›',
      'dl.macName': 'macOS 유니버설 (Apple Silicon & Intel)',
      'dl.macSub': 'macOS 10.15+ (Catalina 이상) Universal DMG',
      'dl.tipWinTitle': '🛡️ 브라우저에서 "일반적으로 다운로드되지 않음" 또는 Windows SmartScreen 경고가 뜨나요?',
      'dl.tipBrewTitle': '🍺 macOS Homebrew 한 줄 설치 (추천 · 격리 자동 해제)',
      'dl.tipMacTitle': '🍎 macOS 첫 실행 안내 (최초 1회 · 터미널 상시 실행 불필요)',
      'dl.copyCmd': '명령어 복사',
      'dl.tipWv2Title': '🪟 Windows에서 "Could not find the WebView2 Runtime" 오류가 뜨나요?',
      'dl.tipWv2Btn': 'Microsoft WebView2 다운로드 ›',
      'dl.win7Title': '🖥️ Windows 7 SP1 (64비트) 전용 포터블 (WebView2 109 내장)',
      'dl.win7Btn': 'Win7 포터블 다운로드 (178.99 MB)',
      'dl.win7Gh': 'GitHub 공식 미러 (Win7) ›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+ (x86_64 & ARM64)',
      'dl.linuxX64Deb': 'x86_64 .deb (2.39 MB)',
      'dl.linuxArmDeb': 'ARM64 .deb (2.35 MB)',
      'dl.linuxX64AppImage': 'x86_64 AppImage (77.53 MB) ›',
      'dl.linuxArmAppImage': 'ARM64 AppImage (75.70 MB) ›',
      'dl.tipGameTitle': '🎮 전체화면 게임 · OBS 방송 · 안티치트 안전 가이드',
      'feat.title': '한 픽셀까지 집요하게 다듬은 부드러움',
      'feat.whaleEyebrow': 'New Skin · 🐳 고래소녀 (BigFish) · 14초 영상',
      'feat.whaleSpec1Val': '3부위 동시',
      'feat.whaleSpec1Lbl': '마우스 + 타이핑 + 고래꼬리 타건',
      'feat.whaleSpec2Val': '속도 반응',
      'feat.whaleSpec2Lbl': '고속 타건 시 발그레 → 환한 웃음',
      'feat.whaleSpec3Val': '자동 눈 가리기',
      'feat.whaleSpec3Lbl': '비밀번호 입력 시 두 손으로 가림',
      'feat.whaleTryBtn': '위 체험판에서 고래소녀 바로 써보기 ↑',
      'feat.whaleDlBtn': '1080p 세로 데모 저장 (14초)',
      'feat.whaleMeta': '1080×1920 · 60fps · 14초 동기화 타건·클릭 사운드 포함',
      'feat.kbSpec1Val': '108키',
      'feat.kbSpec1Lbl': '완전한 F열 및 숫자 키패드',
      'feat.kbSpec2Val': '이중 시점',
      'feat.kbSpec2Lbl': '고양이 시점 / 시청자 시점',
      'feat.kbSpec3Val': '정확한 구분',
      'feat.kbSpec3Lbl': '메인 Enter와 Num↵ 독립 인식',
      'feat.kbTryBtn': '위 체험판에서 108키 배열 체험하기 ↑',
      'feat.mouseSpec1Lbl': '좌/우/휠 클릭 완전 독립 발광',
      'feat.mouseSpec2Lbl': 'SHA-256 자동 무결성 검증',
      'feat.mouseSpec3Val': '원클릭 업뎃',
      'feat.mouseSpec3Lbl': 'Win / Mac 무중단 자동 재시작',
      'bento.1Title': '스크롤 없는 2탭 메뉴 & 클릭 통과 기억',
      'bento.1Body': '「외형·반응 / 키보드·OBS·설정」 2탭으로 한 화면에 깔끔하게 정리. 20%–150% 자유 조절과 재시작 후 클릭 통과 잠금 유지 및 시작 시 원클릭 해제 바를 제공합니다.',
      'bento.2Title': '머리 쓰다듬기 & 실시간 합성 골골송',
      'bento.2Body': '고양이 머리 위로 커서를 올려 좌우로 쓰다듬으면 나른하게 눈을 가늘게 뜨며 Web Audio 24.5Hz로 실시간 합성한 부드러운 골골송을 들려줍니다.',
      'bento.3Title': '비밀번호 입력 시 자동 눈 가리기',
      'bento.3Body': 'Windows·macOS 비밀번호 입력창을 OS 수준에서 자동 감지해 Rust 계층에서 키 입력을 차단합니다. 고양이는 눈을 감고, 고래소녀는 두 손으로 눈을 가립니다.',
      'bento.4Title': 'GPU 인스턴싱 최적화 & 게임 자동 절전',
      'bento.4Body': '3D 키캡 인스턴스 배칭과 GPU 정점 변형으로 활성 GPU 사용량을 75% 절감. 게임 실행 감지 시 자동으로 30 FPS 절전 모드(최대 88.5% 절감)로 전환됩니다.',
      'mcp.p1Text': '💬 "KuroCat MCP로 브리티시 숏헤어 블루 고양이를 만들어 바로 적용해 줘"',
      'mcp.p2Text': '📸 "우리 집 고양이 사진을 보고 꼭 닮은 전용 펫을 만들어 줘!"',
      'mcp.p3Text': '⚙️ "펫 크기를 85%로 줄이고 108키 시청자 시점으로 바꿔 줘"',
      'mcp.copyShort': '복사',
      'mcp.tabHttp': '로컬 HTTP',
      'mcp.footerMeta': '내장 도구 7종 지원 · 0.4초 핫 리로드',
      'mcp.copyCfg': '설정 복사',
      'growth.eyebrow': 'Live Growth · Real-Time Telemetry',
      'growth.title': '실시간 성장 그래프',
      'growth.sub': '전체 채널 누적 다운로드 수와 GitHub Stars 추이를 실시간으로 추적합니다. 그래프에 마우스를 올려 시점별 상세 수치를 확인하세요.',
      'growth.dlLbl': '누적 다운로드',
      'growth.starLbl': 'GitHub Stars',
      'growth.modeBoth': '함께 보기',
      'growth.modeDl': '다운로드만',
      'growth.modeStars': 'Stars만',
      'growth.loading': '실시간 성장 데이터를 동기화하는 중…',
      'growth.starCta': '⭐ GitHub에서 Star로 응원하기 ›',
      'donate.eyebrow': 'Support Open Source · Crypto',
      'donate.title': '검은 고양이에게 커피 한 잔 선물하기',
      'donate.sub': 'KuroCat은 MIT 라이선스의 완전 무료 오픈소스입니다. 코딩·업무·방송 중 작은 즐거움이 되었다면 지속적인 유지보수와 무료 배포를 응원해 주세요.',
      'donate.addrLbl': 'ETH / BNB / USDT / USDC · EVM 공용 주소',
      'donate.copy': '주소 복사',
      'footer.home': 'Qianyi 홈',
      'footer.pelican': '펠리컨 벤치마크',
      'footer.donate': '후원하기',
      'footer.releases': '모든 릴리스 (Releases)',
    },
    html: {
      'hero.title': 'KuroCat · 키보드를 치는 검은 고양이<br /><span>내 바탕화면에 살아요</span>',
      'hero.sub':
        '무료 오픈소스 투명 바탕화면 키보드·마우스 펫. <strong>3D 피규어 / 2D 클래식</strong> 원클릭 전환과 초저사양 GPU 최적화로 게임 중에도 가볍게 동작합니다. <strong>고양이 6종 + 고래소녀</strong>, 쓰다듬기 골골송, 비밀번호 눈 가리기, OBS 투명 방송, <strong>AI 펫 커스텀</strong>을 지원합니다.',
      'dl.sub':
        '모든 패키지에 <strong>20%–150% 자유 크기 조절</strong>, <strong>65% / 108키 즉시 전환</strong>, <strong>커스텀 꼬리 타건</strong>, <strong>앱 내 자동 업데이트</strong>가 기본 포함됩니다.<br /><code>kurocat.org</code> 고속 CDN 미러와 SHA-256 검증을 지원하는 GitHub Releases 공식 링크를 함께 제공합니다.',
      'dl.winDesc':
        '기본 65% 콤팩트 배열로 시작하며 바탕화면·시작 메뉴·제거 항목을 자동 생성합니다. 우클릭 메뉴에서 <strong>108 풀배열</strong>, <strong>커스텀 꼬리 키</strong>, OBS 투명 소스, 원클릭 업데이트를 언제든 사용할 수 있습니다.',
      'dl.macDesc':
        'Apple Silicon(M1–M4)과 Intel Mac(macOS 10.15 Catalina 이상)을 모두 지원하는 네이티브 Universal DMG. 65%/108키와 고양이 6종 및 고래소녀 스킨이 모두 포함됩니다. <code>.dmg</code>를 열어 「응용 프로그램」에 드래그하세요.',
      'dl.tipWinBody':
        '상용 EV 코드 서명 인증서가 없는 무료 오픈소스 소프트웨어이므로 다운로드 시 브라우저 경고가 표시될 수 있습니다(전체 소스는 GitHub에 100% 공개됨):<br /><strong>① Edge</strong>: 다운로드 항목에 마우스 올리기 → <strong><code>···</code></strong> → <strong>유지</strong> → 삭제 옆 <strong><code>▾</code> (더 보기)</strong> → <strong>그래도 유지</strong> (Chrome: <code>Ctrl + J</code> → 위험한 파일 유지 → 계속 유지).<br /><strong>② Windows SmartScreen 파란 창</strong>: <strong>추가 정보</strong> → <strong>실행</strong>을 클릭하세요.',
      'dl.tipBrewBody':
        '공식 Homebrew Tap(<code>qianyiai/homebrew-tap</code>)이 오픈되었습니다. 오른쪽 명령어 한 줄로 설치하며 격리 속성도 자동 해제됩니다(수동 <code>xattr</code> 불필요). 이후 <code>brew upgrade --cask kurocat</code>로 간편하게 업그레이드할 수 있습니다.',
      'dl.tipMacBody':
        'Apple 공증을 받지 않은 오픈소스 앱이므로 첫 실행 시 "개발자를 확인할 수 없음" 또는 "손상됨" 알림이 뜨면 터미널에서 오른쪽 명령어를 한 번만 실행해 격리를 해제하세요. 전역 입력 감지는 <strong>시스템 설정 → 개인정보 보호 및 보안</strong>에서 <strong>손쉬운 사용</strong>과 <strong>입력 모니터링</strong> 모두에 <code>KuroCat</code>을 허용하면 즉시 작동합니다(Karabiner-Elements 호환).',
      'dl.tipWv2Body':
        'Microsoft Edge WebView2가 없는 구형 Win10 / LTSC 환경에서 발생합니다(<strong>Windows 7 사용자는 아래 전용 포터블 버전을 이용하세요</strong>). 오른쪽 Microsoft 공식 1.8 MB 설치 도구를 <strong>우클릭 → 관리자 권한으로 실행</strong>으로 설치하면 해결됩니다.',
      'dl.win7Body':
        'Windows 7 SP1 64비트 전용 네이티브 PE 6.01 빌드(Win8/Win10 DLL 의존성 0). Microsoft의 마지막 Win7 오프라인 <strong>WebView2 109.0.1518.78</strong> 런타임과 256단계 픽셀 투명 안티앨리어싱 렌더링을 탑재해 Aero 여부와 무관하게 흰 테두리가 전혀 없습니다. 압축을 모두 풀고 <code>WebView2Runtime</code>과 같은 폴더의 <code>KuroCat.exe</code>를 실행하세요.',
      'dl.linuxBody':
        '루트 권한 없는 X11 <code>XRecord</code> 전역 입력 감지 및 Wayland <code>evdev</code> 폴백, 투명 최상단 창, 클릭 통과(<code>Alt</code> 드래그) 및 자동 실행을 지원합니다. <strong><code>glibc &gt;= 2.34</code></strong>(Ubuntu 22.04+ / Debian 12+ / KylinOS V11+)가 필요합니다. 가벼운 <strong>.deb (2.4 MB)</strong>(<code>libwebkit2gtk-4.1-0</code> 필요) 또는 포터블 <strong>.AppImage</strong>를 선택하세요.',
      'dl.tipGameBody':
        '<strong>① 전체화면 &amp; 테두리 없는 창 게임</strong>: 포커스를 빼앗지 않는 최상단 가드를 내장(클릭 통과 잠금 + <code>Alt</code> 임시 이동 권장). 관리자 권한 게임은 트레이에서 <strong>관리자 권한으로 다시 시작</strong>을 사용하세요.<br /><strong>② OBS 투명 방송 (크로마키 불필요)</strong>: 우클릭 또는 트레이에서 <strong>OBS 소스 주소 복사</strong>(로컬 <code>http://127.0.0.1:27421/obs</code>, 기본 꺼짐으로 부하 0)를 누르고 OBS 브라우저 소스에 추가하면 알파 투명 채널, OBS 전용 표시 및 비밀번호 눈 가리기가 모두 연동됩니다.<br /><strong>③ 커널 안티치트 온라인 게임</strong>(발로란트 등): 플레이 전 트레이에서 <strong>입력 감지 일시정지 및 숨기기</strong>를 선택하면 훅을 완전히 해제할 수 있습니다.',
      'feat.whaleHeadline': '신규 스킨 「고래소녀」 등장<br />고래꼬리 타건 · 발그레 웃음 · 비밀번호 가리기',
      'feat.whaleBody':
        '기본 탑재된 <strong>🐳 고래소녀(BigFish)</strong> 스킨은 <strong>왼손 마우스 + 오른손 타이핑 + 물보라 고래꼬리 키 타건</strong> 3부위 동시 동작을 지원합니다. 빠르게 타이핑할수록 수줍게 볼이 붉어지다 환하게 웃고, 비밀번호 입력창에서는 두 손으로 눈을 가리며 모든 키캡을 숨깁니다.',
      'feat.kbHeadline': '65% 콤팩트 &amp; 108 풀배열<br />양방향 시점을 원클릭으로',
      'feat.kbBody':
        '미니멀한 65% 배열과 숫자 키패드가 완비된 108 풀배열을 우클릭 한 번으로 전환하며 우측 하단 기준으로 창 너비를 부드럽게 조절합니다. <strong>고양이 시점(180°)</strong>과 <strong>시청자 시점(정방향 각인)</strong> 전환 시 마우스 좌우 버튼 방향도 자동 동기화됩니다.',
      'feat.mouseHeadline': '좌/우 클릭 독립 컬러 발광<br />&amp; 원클릭 앱 내 자동 업데이트',
      'feat.mouseBody':
        '좌클릭(<code>L</code>), 우클릭(<code>R</code>), 휠/중간 클릭을 선명한 대비 색상과 3D 눌림 음영, <code>LMB</code>/<code>RMB</code> 미니 말풍선으로 완벽히 구분합니다(동시 누름 지원). 고속 CDN 우선(GitHub 폴백) 업데이트 감지로 새 버전이 출시되면 펫 머리 위에 닫을 수 있는 알림 바가 뜨며 SHA-256 검증 후 원클릭 업그레이드를 지원합니다.',
      'mcp.headline': '반려묘 사진 한 장이면<br />AI가 0.4초 만에 바탕화면에 제작',
      'mcp.body':
        'Node.js나 Python 설치가 필요 없습니다. 단일 실행 파일에 <strong>Stdio</strong>와 <strong>로컬 Streamable HTTP(<code>127.0.0.1:27420</code>)</strong> MCP 서버를 모두 내장했습니다. 우클릭「MCP 설정 복사」를 <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong>에 붙여넣고 원하는 털색, 줄무늬, 삼색 얼룩, 눈동자 색을 말로 주문하세요.',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="https://qianyi.one/?lang=ko">Qianyi</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': '비밀번호 입력: 고양이는 눈 감기 / 고래소녀는 눈 가리기…',
    },
    titles: {
      'pg.autoDemoTitle': '자동 타이핑 및 마우스 클릭 데모 전환',
      'pg.mouseTitle': '독립 좌/우 마우스 클릭 데모',
      'pg.curiousTitle': '호기심 큰 눈동자 발동 (마우스를 빠르게 흔들어도 발동)',
      'pg.crossTitle': '비행기 귀 + 꼬리 3연타 책상 쿵 발동 (키를 마구 두드려도 발동)',
      'pg.sleepTitle': '식빵 굽고 Zzz 졸기 발동 (아무 키나 누르면 기상)',
      'pg.bubblesTitle': '키 입력 말풍선 켜기/끄기',
      'pg.purrTitle': '쓰다듬기 골골송 켜기/끄기',
      'pg.headphonesTitle': '게이밍 헤드셋 켜기/끄기 (데스크톱 앱은 게임 실행 시 자동 착용)',
      'pg.orbitTitle': '켜면 캔버스를 드래그해 3D 모델을 360° 회전할 수 있습니다',
      'pg.tailSmartTitle': '평소엔 양손으로 치고, 바쁘거나 빠른 Enter 시 꼬리가 자동 보조',
      'pg.tailCustomTitle': '직접 선택한 키만 꼬리로 타건',
      'pg.tailEdgeTitle': '꼬리 쪽 우측 가장자리 키만 타건 (WASD 보호)',
      'pg.tailOffTitle': '꼬리는 자연스럽게 흔들기만 함 (타건 안 함)',
      'pg.tailPickerTitle': '위 키보드 키캡을 클릭하거나 실제 키를 눌러 꼬리 키 지정',
      'pg.privacyTitle': '비밀번호 눈 가리기 데모 수동 전환',
      'pg.scaleResetTitle': '클릭하여 100%로 초기화',
    },
    ariaLabels: {
      'nav.backAria': 'Qianyi 홈으로 돌아가기',
      'nav.mainAria': '메인 내비게이션',
      'pg.modeAria': '3D / 2D 렌더 모드 전환',
      'pg.backdropAria': '미리보기 배경 전환',
      'pg.canvas2dAria': 'KuroCat 2D 실시간 인터랙티브 체험 캔버스',
      'pg.canvas3dAria': 'KuroCat 3D 실시간 인터랙티브 체험 캔버스',
      'pg.tailPickerAria': '꼬리 타건 키 커스텀 설정',
      'pg.skinGroupAria': '펫 스킨 선택',
      'pg.layoutAria': '키보드 배열',
      'pg.orientAria': '키보드 시점',
      'pg.collarAria': '3D 목걸이 방울 색상',
      'pg.tailModeAria': '꼬리 타건 모드',
      'pg.pwdAria': '비밀번호 눈 가리기 데모 입력란',
      'pg.scaleAria': '크기 조절 20%~150%',
    },
    alts: {
      'hero.iconAlt': 'KuroCat 앱 아이콘',
      'feat.kbImgAlt': 'KuroCat 65% 콤팩트 대 108 풀배열 및 이중 시점 미리보기',
      'feat.mouseImgAlt': 'KuroCat 좌/우 마우스 독립 하이라이트 및 앱 내 자동 업데이트 미리보기',
    },
    downloads: {
      'feat.whaleDlFile': 'KuroCat-고래소녀-14초-세로데모.mp4',
    },
    prompts: {
      'mcp.p1': 'KuroCat MCP로 호박색 눈동자와 아이스블루 키 하이라이트를 가진 브리티시 숏헤어 블루 고양이를 만들어 바로 적용해 줘',
      'mcp.p2': '우리 집 고양이 사진을 보고 KuroCat MCP로 털 무늬와 반점 위치가 꼭 닮은 나만의 바탕화면 펫을 만들어 줘!',
      'mcp.p3': 'KuroCat 크기를 85%로 줄이고 108 풀배열 시청자 시점으로 바꿔 줘',
    },
    skins: {
      black: '검은 고양이',
      ragdoll: '랙돌',
      'orange-tabby': '치즈 태비',
      calico: '삼색이',
      tuxedo: '턱시도',
      siamese: '샴 고양이',
      dafeiyu: '고래소녀',
    },
    tailModeShort: {
      smart: '꼬리: 스마트',
      custom: '꼬리: 커스텀',
      edge: '꼬리: 가장자리',
      off: '꼬리: 흔들기만',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<사용자명>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio 모드 (Claude / Cursor / Antigravity 공통)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;사용자명&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio 모드 (외부 의존성 없음 · 앱 내장 바이너리 직접 연결)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// 로컬 Streamable HTTP 모드 (KuroCat 실행 중 직접 연결)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `최신 버전 ${tag}`,
      heroDownloadWin: (size) => `Windows용 무료 다운로드 (${size})`,
      heroDownloadMac: (size) => `macOS용 무료 다운로드 (${size})`,
      layout: (id) => (id === '108' ? '108 풀배열' : '65% 콤팩트'),
      orient: (o) => (o === 'viewer' ? '시청자 시점' : '고양이 시점'),
      tailPickerBtn: (open, count) =>
        open ? `✓ 선택 중 (${count}개)` : `🐾 꼬리 키 선택 (${count})`,
      tailPickerTitleDefault: (count) => `🐾 아래 키캡을 클릭하거나 실제 키를 눌러 지정 (${count}개 선택됨)`,
      tailKeyAdded: (key, count) => `🐾 "${key}" 추가됨 · 총 ${count}개 (완료 후 테스트)`,
      tailKeyRemoved: (key, count) => `🐾 "${key}" 해제됨 · 총 ${count}개`,
      tailPresetApplied: (preset, count) => {
        const names = { office: 'Enter·Space', rightFn: '방향키·넘패드', edgeMods: '우측 기능키' };
        return `🐾 "${names[preset]}" 적용됨 (${count}개)`;
      },
      tailCleared: () => '🐾 꼬리 키가 모두 초기화되었습니다 (키캡 클릭 또는 입력으로 추가)',
      autoDemoBtn: (running) => (running ? '⏸ 데모 정지' : '▶ 자동 데모'),
      privacyBtn: (active) => (active ? '🙈 눈 가리기 중' : '🔒 눈 가리기'),
      whaleSoundBtn: (muted) => (muted ? '🔇 사운드 켜기' : '🔊 사운드 켜짐'),
      copied: () => '복사됨 ✓',
      copyConfig: () => '설정 복사',
      copyCmd: () => '명령어 복사',
      copyShort: () => '복사',
      totalDownloads: (count) => `누적 다운로드 ${count}회`,
      statsUpdated: (timePart) => `${timePart} (UTC+8) 업데이트 · 30초마다 자동 새로고침`,
    },
  },
};

export function applyStaticI18n(locale: Locale): KuroCatI18nBundle {
  const bundle = KUROCAT_I18N[locale];
  document.documentElement.lang = bundle.htmlLang;
  document.title = bundle.docTitle;
  const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descEl) descEl.content = bundle.metaDesc;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key && key in bundle.text) {
      el.textContent = bundle.text[key];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key && key in bundle.html) {
      el.innerHTML = bundle.html[key];
    }
  });

  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key && key in bundle.placeholders) {
      el.placeholder = bundle.placeholders[key];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key && key in bundle.titles) {
      el.title = bundle.titles[key];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria;
    if (key && key in bundle.ariaLabels) {
      el.setAttribute('aria-label', bundle.ariaLabels[key]);
    }
  });

  document.querySelectorAll<HTMLImageElement>('[data-i18n-alt]').forEach((el) => {
    const key = el.dataset.i18nAlt;
    if (key && key in bundle.alts) {
      el.alt = bundle.alts[key];
    }
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-i18n-download]').forEach((el) => {
    const key = el.dataset.i18nDownload;
    if (key && key in bundle.downloads) {
      el.setAttribute('download', bundle.downloads[key]);
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-prompt]').forEach((el) => {
    const key = el.dataset.i18nPrompt;
    if (key && key in bundle.prompts) {
      el.dataset.prompt = bundle.prompts[key];
    }
  });

  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === locale);
  });

  return bundle;
}
