# mwzzzh dsh — ENV(环境 + 构建/测试/部署 手册)

> 稳定事实,只在环境变化时改。开工/构建前读这里,别重踩。

## 路径 / 工具链
- 仓库:`D:\anzhuonixiang\tools\dsh`(fork `wzzzh2025/mwzzzh_dsh`;`upstream`= `deepseek-ai/deepseek-harness`)
- Node:`v22.19.0`(`D:\exe\node\node.exe`)
- 包管理:`pnpm@11.28.5`,**必须用 `npx pnpm@11.28.5`**
- 全局 npm prefix:`D:\exe\node\node_global`(当前用户**只读**,`npm i -g` 会 EPERM)
- Python:`3.11.13`(`D:/exe/anconda/anconda1/envs/wzzzh_py/python.exe` 用于脚本)
- npm registry:默认 `https://registry.npmmirror.com`;装新包失败时加 `--registry=https://registry.npmjs.org`

## 构建
```powershell
cd D:\anzhuonixiang\tools\dsh
npx pnpm@11.28.5 install --registry=https://registry.npmjs.org
npx pnpm@11.28.5 run build          # 9 gates,首次 ~251s,增量 ~70s
```

## 运行
```powershell
# 独立实例(推荐):会话共用官方,profile 独立
$env:DSH_HOME = 'C:\Users\wzzzh\.dsh-src'
node --import tsx/esm apps/cli/src/bin.ts web --port 3099 --no-open

# 打印带 token 的 URL,必须用它访问(browser-trust fence,不带 token 返回 401)
```

## 测试
- 全量 gate:`npx pnpm@11.28.5 run check:all`
- 单包:`npx pnpm@11.28.5 run test`(需先 `build:native-system`)

## 部署 / 验证
- 构建产物:`apps/cli/lib/bin.js`;也可 `node apps/cli/lib/bin.js web`
- 品牌 profile:`official` 构建显示官方品牌,其他 profile 回退「本地构建」标签(`DSH_CLIENT_BUILD_PROFILE`)

## 环境坑(最省时间)
- **`npm i -g` 必 EPERM**:`D:\exe\node\node_global` 对当前用户只读,一律用 `npx` 或用户级 `--prefix`。
- **镜像缺 tarball**:`registry.npmmirror.com` 元数据有、tarball 404(`@xfcodeai/*` 常见),换官方源。
- **符号链接需管理员**:`New-Item -ItemType SymbolicLink` 失败时用 `cmd /c mklink /J`(junction 不需要提权)。
- **`DSH_SESSION_HOME` 在官方 0.2.1 不存在**(那是 xfdsh fork 自加);要共用会话用 junction 或直接共用 `DSH_HOME`。
- **新 `DSH_HOME` 缺配置**:需从 `~/.dsh` 复制 `settings.yaml`(否则回退 `deepseek-official` 路由)和 `.credentials.yaml`。
- **skill 静默失败**:`SKILL.md` frontmatter 的 YAML 错误只 `logger.warn`,界面上看不到 → 用 `dsh-port/diagnose-logs.mjs` 抓日志。
