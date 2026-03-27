# NOTEBOOK — Personal Tech Blog

硬核简约风格个人技术博客，基于纯静态 HTML + KaTeX，部署于 Vercel。

## 目录结构

```
.
├── index.html              # 首页
├── notes.html              # 笔记列表页
├── about.html              # 关于页
├── vercel.json             # Vercel 部署配置
├── css/
│   └── style.css           # 全局样式（深色极简风）
└── posts/
    └── wave-equation-dalembert-separation.html   # 达朗贝尔公式 & 分离变数法
```

## 技术栈

- 纯静态 HTML5 + CSS3
- [KaTeX](https://katex.org) — LaTeX 公式渲染（CDN 引入，无需构建）
- [Vercel](https://vercel.com) — 静态托管

## 本地预览

```bash
# 任意静态服务器均可，例如：
npx serve .
# 或
python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080`

## 部署到 Vercel

### 方法一：Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

### 方法二：连接 GitHub 仓库

1. 将此目录推送到 GitHub 仓库
2. 登录 [vercel.com](https://vercel.com)，选择 **Add New Project**
3. 导入该 GitHub 仓库
4. Framework Preset 选 **Other**，Output Directory 保持默认（根目录）
5. 点击 **Deploy** 即可

Vercel 会自动检测到 `vercel.json` 配置。

## 添加新文章

1. 在 `posts/` 目录新建 HTML 文件（参考现有文章结构）
2. 在 `notes.html` 的 `#post-list` 中新增 `.post-card`
3. 在 `index.html` 首页的 `recent_posts` 中更新最新文章

公式使用 KaTeX 语法：
- 行内公式：`$...$`
- 块级公式：`$$...$$`
