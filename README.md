# GallivantSoft Official Website

GallivantSoft Phase 1 官方网站。项目使用 Astro 生成纯静态站点，包含英语、简体中文和 Bahasa Melayu 三套完整内容，构建产物可直接部署到 Nginx。

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

修改 [`src/i18n/content.js`](src/i18n/content.js)。文件中包含：

- `en`：English
- `zh`：简体中文
- `ms`：Bahasa Melayu

新增字段时应为三种语言同时增加，然后运行 `npm run check`。对应静态路由为 `/en/`、`/zh/` 和 `/ms/`。根路由保留可在禁用 JavaScript 时阅读的英文内容；有 JavaScript 时会在没有手动偏好的情况下参考浏览器语言。

## 修改 Logo

- 导航与 Footer 使用 [`src/components/Logo.astro`](src/components/Logo.astro)。
- 单色/几何标志资源位于 [`public/logo-mark.svg`](public/logo-mark.svg)。
- Favicon 位于 [`public/favicon.svg`](public/favicon.svg)。
- 社交分享预览图位于 [`public/og-image.svg`](public/og-image.svg)。

如果改变品牌图形，建议同步更新上述四处，保持深色和浅色背景下的识别一致。

## 配置生产域名

确认真实域名后，在 `src/config/site.js` 中修改：

```js
productionDomain: 'https://www.example.com'
```

请使用完整 `https://` 地址，不要保留末尾斜杠。重新运行 `npm run build` 后，canonical、hreflang、Open Graph 绝对地址和 sitemap 才会指向该正式域名。域名未确定时留空，项目不会伪造域名或生成错误的绝对 sitemap。

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

## Phase 1 范围

当前版本是企业展示型静态网站，刻意不包含：

- 数据库、用户账户、CMS 或管理后台；
- 服务端咨询表单；
- 客户案例数据或未经证实的业绩数字；
- Google Analytics、Facebook Pixel 或其他第三方追踪。

咨询入口直接使用 WhatsApp、邮件和电话，不会显示虚假的“提交成功”状态。
