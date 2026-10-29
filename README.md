# GallivantSoft Official Website

GallivantSoft Phase 2 企业官网。项目使用 Astro 生成纯静态站点，在 Phase 1 首页的基础上扩展了 Services、Solutions、About 与 Contact 独立页面，并为英语、简体中文和 Bahasa Melayu 提供完整内容。构建产物可直接部署到 Nginx。

## 环境要求

- Node.js `>= 22.23.4`
- npm `>= 9.6.5`

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址由 Astro 在终端中输出，通常为 `http://localhost:4321/`。

## 检查与构建

```bash
npm run check
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
- WhatsApp 号码；
- 邮箱；
- 生产域名；
- 默认语言与支持语言。

页面组件不单独写死联系方式。WhatsApp、邮件和电话按钮均从该配置生成可用链接。

## 修改多语言文案

Phase 1 首页文案由 [`src/i18n/content.js`](src/i18n/content.js) 管理，Phase 2 内页文案位于 [`src/i18n/phase2.js`](src/i18n/phase2.js)。语言键包括：

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
| About | `/en/about/` | `/zh/about/` | `/ms/about/` |
| Contact | `/en/contact/` | `/zh/contact/` | `/ms/contact/` |

语言切换会保留当前页面类型。根路由保留可在禁用 JavaScript 时阅读的英文内容；有 JavaScript 时会在没有手动偏好的情况下参考浏览器语言。

## Phase 2 页面内容

- Services：六类服务均包含适用场景、功能范围、实施方法和交付流程；
- Solutions：六类解决方案分别说明业务问题、技术响应和预期收益；
- About：使命、工程理念、协作方式和可配置技术参考；
- Contact：项目类型、需求描述、预算、时间计划与姓名字段。

技术参考集中在 [`src/data/technologies.js`](src/data/technologies.js)，用于项目规划展示，不代表未经确认的固定交付承诺。

Contact 表单只进行浏览器端校验，并在通过校验后生成 WhatsApp 预填消息。网站不会把表单数据发送到自建服务器、数据库或本地存储，也不会显示虚假的“提交成功”状态。

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
├─ data/          视觉结构数据
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

当前版本是企业展示型静态网站，刻意不包含：

- 数据库、用户账户、CMS 或管理后台；
- 服务端咨询表单；
- 客户案例数据或未经证实的业绩数字；
- Google Analytics、Facebook Pixel 或其他第三方追踪。

咨询入口直接使用 WhatsApp、邮件和电话，不会显示虚假的“提交成功”状态。
