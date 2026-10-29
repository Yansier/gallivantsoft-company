# GallivantSoft Official Website

GallivantSoft Phase 4 企业官网。项目使用 Astro 生成纯静态站点，包含三语 Interactive Lab、按需加载的 Three.js 数字运营孪生、Precision Inspection Station 交互式装配浏览器、三个界面概念演示，以及本地邮件咨询流程。构建产物可直接部署到 Nginx。

## 环境要求

- Node.js `>= 22.23.4`
- npm `>= 9.6.5`

也可以使用仓库已有的 `pnpm-lock.yaml`：`pnpm install && pnpm run dev`。

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址由 Astro 在终端中输出，通常为 `http://localhost:4321/`。

## 检查与构建

```bash
npm run check
npm run check:inspection
npm run build
```

`npm run build` 会：

1. 生成 `dist/` 静态站点；
2. 在已配置真实生产域名时生成 `sitemap.xml`；
3. 把 sitemap 绝对地址写入构建产物的 `robots.txt`。

预览构建产物：

```bash
npm run preview
```

## 修改企业信息与联系方式

统一修改 [`src/config/site.js`](src/config/site.js)：

- 公司名、品牌副标题、国家；
- 电话显示值与 `tel:` 值；
- 邮箱；
- 生产域名；
- 默认语言与支持语言。

页面组件不单独写死联系方式。网站只保留邮件和电话两种正式联系入口，链接均从该配置生成。

## 修改多语言文案

Phase 1 首页文案由 [`src/i18n/content.js`](src/i18n/content.js) 管理，Phase 2 内页文案位于 [`src/i18n/phase2.js`](src/i18n/phase2.js)，Phase 3 界面 Demo 文案位于 [`src/i18n/phase3.js`](src/i18n/phase3.js)，Phase 4 Interactive Lab 与数字孪生文案位于 [`src/i18n/phase4.js`](src/i18n/phase4.js)。语言键包括：

- `en`：English
- `zh`：简体中文
- `ms`：Bahasa Melayu

新增字段时应为三种语言同时增加，然后运行 `npm run check`。

每种语言都会预生成以下真实静态路由：

| 页面 | English | 简体中文 | Bahasa Melayu |
| --- | --- | --- | --- |
| Home | `/en/` | `/zh/` | `/ms/` |
| Services | `/en/services/` | `/zh/services/` | `/ms/services/` |
| Solutions | `/en/solutions/` | `/zh/solutions/` | `/ms/solutions/` |
| Showcase | `/en/showcase/` | `/zh/showcase/` | `/ms/showcase/` |
| About | `/en/about/` | `/zh/about/` | `/ms/about/` |
| Contact | `/en/contact/` | `/zh/contact/` | `/ms/contact/` |

Showcase 下另为 Digital Operations Twin、Precision Inspection Station、Operations Dashboard、Customer Management 与 Booking Workflow 各生成三种语言路由。自定义语言切换器通过替换首个路径段保留当前深层页面。

语言切换会保留当前页面类型。根路由保留可在禁用 JavaScript 时阅读的英文内容；有 JavaScript 时会在没有手动偏好的情况下参考浏览器语言。

## Phase 2 页面内容

- Services：六类服务均包含适用场景、功能范围、实施方法和交付流程；
- Solutions：六类解决方案分别说明业务问题、技术响应和预期收益；
- About：使命、工程理念、协作方式和可配置技术参考；
- Contact：项目类型、需求描述、预算、时间计划与姓名字段。

技术参考集中在 [`src/data/technologies.js`](src/data/technologies.js)，用于项目规划展示，不代表未经确认的固定交付承诺。

Contact 表单只进行浏览器端校验，并生成结构化邮件标题与正文，再通过 `mailto:` 请求打开用户的默认邮件客户端。页面不会宣称邮件已发送。用户也可以复制完整咨询内容；剪贴板 API 不可用时会显示并选中只读文本区域供手动复制。网站不会把咨询内容提交到自建服务器、数据库或本地存储。

## Phase 3 Showcase

- Showcase 首页明确把所有内容标记为 Interactive Concept Demo，不作为真实客户案例宣传；
- `NexusOps`：统计周期、图表指标、交易筛选与后台导航均可操作；
- `ClientOrbit`：支持虚构客户搜索、状态筛选、详情查看、状态修改与重置；
- `FlowReserve`：支持订单筛选、详情查看、合理状态推进、取消与重置；
- 所有模拟数据集中在 [`src/data/showcase/`](src/data/showcase/)；状态只保存在当前浏览器内存中；
- Demo 不连接数据库、真实业务系统、支付、通知或第三方 API。

旧即时通讯入口、配置、链接、事件处理与相关文案已经完全移除。首页、Contact、Privacy 与 Footer 统一使用邮件和电话流程。

## Phase 4 Interactive Lab

- Showcase 已重构为 `GallivantSoft Interactive Lab`，旗舰入口为 `Digital Operations Twin`；三个 Phase 3 Demo 继续保留原路由，并作为界面概念档案展示；
- Three.js 作为本地依赖安装，不使用 CDN；只有用户点击 “Launch 3D Experience” 后才动态加载场景代码；
- 数字孪生包含可旋转/缩放的微型物流中心、Storage / Processing / Dispatch 区域、订单创建、开始、下一步、暂停/继续和重置控制；
- 3D 包裹、流程阶段、KPI、状态与活动记录由 [`src/scripts/digital-twin/state.js`](src/scripts/digital-twin/state.js) 的单一状态模型同步驱动；
- 场景使用共享几何体、受限像素比与按需帧渲染；小屏设备自动进入高效模式，页面隐藏时暂停动画，离开页面时释放 GPU 资源；
- WebGL 不可用时显示可读降级信息，运营控制面板仍可使用；首页和 Showcase 列表仅渲染静态封面，不加载 Three.js。

### Precision Inspection Station Assembly Explorer

- 三语路由：`/{lang}/showcase/inspection-station/`；页面先显示 Blender 实拍渲染封面，只有点击启动按钮后才下载约 3.85 MiB 的现有 GLB 并动态加载 Three.js；
- 浏览器直接读取 GLB 的八个顶层组件，并将光学镜头、检测头、滚轴组、控制面板与双风扇整理为五个有展示价值的细节组，不把 206 个网格全部暴露为按钮；
- 支持模型点击选择、HTML/CSS 投影标注、非破坏性材质强调、自动包围盒聚焦、隔离/恢复、设计化爆炸拆解、可中断反向重组、固定产品视角及一键复位；
- 所有原始局部变换在加载时保存，重复拆解/重组从快照计算目标位置，避免累计漂移；统一动画调度器在页面隐藏或静止时停止无意义渲染；
- `npm run check:inspection` 验证 GLB 层级、代表性子零件、爆炸计划、细节隔离、八次往返变换无漂移和三语言技术说明。

## 修改 Logo

- 导航与 Footer 使用 [`src/components/Logo.astro`](src/components/Logo.astro)。
- 单色/几何标志资源位于 [`public/logo-mark.svg`](public/logo-mark.svg)。
- Favicon 位于 [`public/favicon.svg`](public/favicon.svg)。
- 社交分享预览图位于 [`public/og-image.svg`](public/og-image.svg)。

如果改变品牌图形，建议同步更新上述四处，保持深色和浅色背景下的识别一致。

## 配置生产域名

确认真实域名后，在 `src/config/site.js` 中修改：

```js
productionDomain: 'https://你的正式域名'
```

请使用完整 `https://` 地址，不要保留末尾斜杠。重新运行 `npm run build` 后，canonical、hreflang、Open Graph 绝对地址和 sitemap 才会指向该正式域名。构建脚本会递归发现 `dist/` 中的全部页面，因此新增静态页面会自动进入 sitemap。域名未确定时留空，项目不会伪造域名或生成错误的绝对 sitemap。

## 部署到宝塔 Nginx

1. 在服务器上使用符合版本要求的 Node.js 执行 `npm ci && npm run build`，或在本地构建。
2. 在宝塔创建纯静态站点，将站点根目录指向上传后的 `dist/`。
3. 确保默认文档包含 `index.html`。
4. 配置 SSL，再把最终 HTTPS 域名写入 `productionDomain` 并重新构建。
5. Nginx 可使用如下静态路由片段：

```nginx
location / {
    try_files $uri $uri/ =404;
}
```

不建议把所有 404 重写到首页，因为本项目已经按语言预生成真实静态路由。

## 项目结构

```text
src/
├─ components/    页面组件、Logo、图标和技术可视化
├─ config/        公司及全局配置
├─ data/          视觉结构数据与 Showcase 模拟数据
├─ i18n/          三语文案
├─ layouts/       SEO 与全局页面骨架
├─ pages/         根路由和多语言静态路由
├─ scripts/       原生交互脚本
└─ styles/        设计系统与响应式样式
public/            静态 SVG 与 robots.txt
scripts/           构建后 SEO 生成脚本
dist/              构建产物
```

## 当前范围

当前版本是带浏览器端概念演示的企业展示型静态网站，刻意不包含：

- 数据库、用户账户、CMS 或管理后台；
- 服务端咨询表单；
- 客户案例数据或未经证实的业绩数字；
- Google Analytics、Facebook Pixel 或其他第三方追踪。

咨询入口使用邮件和电话。邮件内容由用户在本地邮件客户端确认并发送，网站不会显示虚假的“提交成功”状态。

## 当前验收结果

- `pnpm run check`：63 个文件，0 errors / 0 warnings / 0 hints；
- `pnpm run check:inspection`：8 个主组件、5 个精选细节组、8 次无漂移往返和 3 种语言均通过；
- `pnpm run build`：成功生成 38 个静态页面；
- `productionDomain` 仍为空，因此不会生成包含虚构域名的绝对 sitemap；
- 已在真实浏览器中检查 `375px`、`390px`、`768px`、`1024px`、`1440px`；代表页面均未出现整页横向溢出；
- 已实际验证首页 CTA/Showcase 集成、1024px 导航、三语 Demo 路径保留、表单必填验证、邮件内容生成、剪贴板复制和超长内容回退；
- 已实际操作数字孪生的启动、创建订单、开始、暂停/继续、完整流程、区域选择、重置与 WebGL 降级，并复验三个既有 Demo 路由；修复后的测试页面未出现新的控制台 error；
- 已在真实 Chrome/SwiftShader 中验证 Precision Inspection Station 的延迟加载、射线选择、投影标签、聚焦、隔离、拆解/重组、中途反向、四个产品视角、三语路径、390px/768px 布局和 WebGL 静态封面降级；浏览器控制台无 error；
- 默认邮件客户端由浏览器请求打开，但网站无法也不会验证用户是否最终发送或邮件是否送达。
