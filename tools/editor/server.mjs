import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat, unlink, cp, rm, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const editorRoot = path.join(root, 'tools/editor');
const draftRoot = path.join(root, '.local-editor/drafts');
const draftImagesRoot = path.join(root, '.local-editor/images');
const hiddenRoot = path.join(root, 'content/hidden');
const pendingFile = path.join(root, '.local-editor/pending.json');
const publishCommitFile = path.join(root, '.local-editor/publish-commit.txt');
const run = promisify(execFile);
const topics = { product: '产品', ai: 'AI', business: '商业', system: '自我系统', observe: '观察' };
const port = Number(process.env.EVANSPEAK_EDITOR_PORT || 8898);
const sitePaths = ['index.html', 'notes', 'paths', 'explore', 'topics', 'assets', 'styles.css', 'content/hidden'];

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const decode = (value) => String(value ?? '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return entity[0] === '#' ? String.fromCodePoint(Number.parseInt(entity[1]?.toLowerCase() === 'x' ? entity.slice(2) : entity.slice(1), entity[1]?.toLowerCase() === 'x' ? 16 : 10)) : named[entity.toLowerCase()] ?? `&${entity};`;
});
const plain = (html) => decode(String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
const articlePath = (topic, slug) => path.join(root, 'topics', topic, 'notes', slug, 'index.html');
const hiddenPath = (topic, slug) => path.join(hiddenRoot, topic, slug, 'article.html.txt');
const draftPath = (topic, slug) => path.join(draftRoot, topic, `${slug}.json`);
const validKey = (topic, slug) => Object.hasOwn(topics, topic) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const read = (file) => readFile(file, 'utf8');
const readIf = async (file) => existsSync(file) ? read(file) : null;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const git = async (...args) => (await run('git', args, { cwd: root, maxBuffer: 5_000_000 })).stdout.trim();

async function pendingPaths() {
  const value = await readIf(pendingFile);
  return value ? JSON.parse(value) : [];
}

async function markPending(topic, slug) {
  const paths = [
    `topics/${topic}/notes/${slug}`,
    `content/hidden/${topic}/${slug}`,
    `topics/${topic}/notes/index.html`,
    `topics/${topic}/index.html`,
    'notes/index.html', 'index.html',
  ];
  const pending = [...new Set([...(await pendingPaths()), ...paths])];
  await mkdir(path.dirname(pendingFile), { recursive: true });
  await writeFile(pendingFile, JSON.stringify(pending, null, 2) + '\n');
}

async function resolvePage(input) {
  if (typeof input !== 'string' || !input || input.includes('\\') || input.includes('\0')) throw new Error('页面地址无效');
  const raw = input.replace(/^\/+/, '');
  const relative = raw.endsWith('/') ? `${raw}index.html` : raw.endsWith('.html') ? raw : `${raw}/index.html`;
  if (!/^(?:index\.html|(?:topics|notes|paths|explore)\/[a-zA-Z0-9/_-]+\.html)$/.test(relative)) throw new Error('只能编辑本站 HTML 页面');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error('页面地址超出项目目录');
  const actual = await realpath(file);
  if (!actual.startsWith(root + path.sep)) throw new Error('页面地址超出项目目录');
  return { file, relative };
}

async function pageInfo(input) {
  const { file, relative } = await resolvePage(input);
  const html = await read(file);
  return { path: relative, html, hash: digest(html) };
}

async function updatePage({ path: input, html, hash, patches }) {
  if (typeof html !== 'string' || !/<!doctype html/i.test(html) || !/<html\b/i.test(html) || !/<body\b/i.test(html)) throw new Error('请提交完整 HTML 页面');
  const { file, relative } = await resolvePage(input);
  const original = await read(file);
  if (digest(original) !== hash) throw new Error('HTML 已被其他方式修改。请重新打开页面后再更新');
  if (patches !== null && patches !== undefined) {
    if (typeof patches !== 'object' || Array.isArray(patches) || !/<article\b[^>]*class="[^"]*\bbody\b/i.test(original)) throw new Error('页面补丁无效');
    const patterns = {
      h1: /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i,
      '.summary': /(<p\b[^>]*class="[^"]*\bsummary\b[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/i,
      '.kicker': /(<span\b[^>]*class="[^"]*\bkicker\b[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i,
      '.state': /(<span\b[^>]*class="[^"]*\bstate\b[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i,
      '.tags': /(<div\b[^>]*class="[^"]*\btags\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/i,
      'article.body': /(<article\b[^>]*class="[^"]*\bbody\b[^"]*"[^>]*>)([\s\S]*?)(<\/article>)/i,
      'aside.related': /(<aside\b[^>]*class="[^"]*\brelated\b[^"]*"[^>]*>)([\s\S]*?)(<\/aside>)/i,
    };
    let patched = original;
    for (const [selector, content] of Object.entries(patches)) {
      if (!Object.hasOwn(patterns, selector) || typeof content !== 'string') throw new Error('页面补丁无效');
      patched = replaceInner(patched, patterns[selector], content, selector);
    }
    if (Object.hasOwn(patches, 'h1')) patched = replaceInner(patched, /(<title>)([\s\S]*?)(<\/title>)/i, esc(plain(patches.h1)) + ' | Evan Speak', '浏览器标题');
    if (Object.hasOwn(patches, '.summary')) patched = patched.replace(/<meta\b[^>]*name="description"[^>]*>/i, '<meta name="description" content="' + esc(plain(patches['.summary'])) + '" />');
    html = patched;
  }
  const images = [];
  const updated = html.replace(/src=(['"])data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)\1/g, (_match, quote, type, base64) => {
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > 8_000_000) throw new Error('单张图片不能超过 8 MB');
    const ext = type === 'jpeg' ? 'jpg' : type;
    const name = `${Date.now()}-${images.length}.${ext}`;
    images.push({ name, bytes });
    return `src=${quote}images/${name}${quote}`;
  });
  const additions = [];
  const match = relative.match(/^topics\/(product|ai|business|system|observe)\/notes\/([a-z0-9-]+)\/index\.html$/);
  if (match) {
    const before = extract(original, match[1], match[2]);
    const after = extract(updated, match[1], match[2]);
    if (after.title && after.summary && (before.title !== after.title || before.summary !== after.summary || before.category !== after.category || before.state !== after.state)) {
      additions.push(...await updatedIndexes(after, false));
    }
  }
  if (images.length) {
    const folder = path.join(path.dirname(file), 'images');
    await mkdir(folder, { recursive: true });
    for (const image of images) await writeFile(path.join(folder, image.name), image.bytes);
  }
  await Promise.all([[file, updated], ...additions].map(([target, value]) => writeFile(target, value)));
  return { path: relative, html: updated, hash: digest(updated) };
}

async function changes() {
  const awaitingPush = await readIf(publishCommitFile);
  if (awaitingPush) return { files: [`已提交，等待推送：${awaitingPush.trim().slice(0, 10)}`], branch: await git('branch', '--show-current'), committed: true };
  const output = await git('status', '--short', '--untracked-files=all', '--', ...sitePaths);
  return { files: output ? output.split('\n') : [], branch: await git('branch', '--show-current') };
}

async function publishChanges() {
  const branch = await git('branch', '--show-current');
  if (branch !== 'main') throw new Error('当前不在 main 分支，不能从工作台推送');
  const awaitingPush = await readIf(publishCommitFile);
  if (awaitingPush) {
    if ((await git('rev-parse', 'HEAD')) !== awaitingPush.trim()) throw new Error('待推送提交之后又有新的提交。请检查 Git 状态后再发布');
    await git('push', 'origin', 'main');
    await writeFile(pendingFile, '[]\n');
    await unlink(publishCommitFile);
    return { ok: true };
  }
  if (Number(await git('rev-list', '--count', 'origin/main..HEAD')) > 0) throw new Error('main 已有其他未推送提交。请先检查 Git 历史');
  const staged = (await git('diff', '--cached', '--name-only', '-z')).split('\0').filter(Boolean);
  const allowed = (name) => sitePaths.some((entry) => name === entry || name.startsWith(`${entry}/`));
  if (staged.some((name) => !allowed(name))) throw new Error('暂存区还有其他文件。请先处理这些变更，再从工作台推送');
  const current = await changes();
  if (!current.files.length) throw new Error('待发布文件没有 Git 变更');
  const changedPaths = [];
  for (const entry of sitePaths) if (await git('status', '--short', '--', entry)) changedPaths.push(entry);
  await git('add', '-A', '--', ...changedPaths);
  await git('commit', '-m', 'Update Evan Speak content');
  await writeFile(publishCommitFile, `${await git('rev-parse', 'HEAD')}\n`);
  await git('push', 'origin', 'main');
  await writeFile(pendingFile, '[]\n');
  await unlink(publishCommitFile);
  return { ok: true };
}

function matchPart(html, pattern) {
  return html.match(pattern)?.[1] ?? '';
}

function extract(html, topic, slug) {
  const title = plain(matchPart(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
  const summary = plain(matchPart(html, /<p\b[^>]*class="[^"]*\bsummary\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i));
  const body = matchPart(html, /<article\b[^>]*class="[^"]*\bbody\b[^"]*"[^>]*>([\s\S]*?)<\/article>/i).trim();
  const related = matchPart(html, /<aside\b[^>]*class="[^"]*\brelated\b[^"]*"[^>]*>([\s\S]*?)<\/aside>/i).trim();
  const tags = [...matchPart(html, /<div\b[^>]*class="[^"]*\btags\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i).matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map((m) => plain(m[1]));
  const kicker = plain(matchPart(html, /<(?:span|div)\b[^>]*class="[^"]*\bkicker\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/i));
  const state = plain(matchPart(html, /<span\b[^>]*class="[^"]*\bstate\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i))
    || plain(matchPart(html, /<strong>内容状态<\/strong>([\s\S]*?)<\/div>/i));
  return { topic, slug, title, summary, body, related, tags, kicker, state, category: kicker.split('/')[1]?.trim() || '', special: !body, rawHtml: html };
}

function replaceInner(html, regex, value, label) {
  if (!regex.test(html)) throw new Error(`页面缺少 ${label}，请使用源码模式编辑`);
  return html.replace(regex, (_, open, _old, close) => `${open}${value}${close}`);
}

function renderStandard(source, item) {
  let html = source || newArticle(item);
  html = replaceInner(html, /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i, esc(item.title), '标题');
  html = replaceInner(html, /(<p\b[^>]*class="[^"]*\bsummary\b[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/i, esc(item.summary), '摘要');
  html = replaceInner(html, /(<span\b[^>]*class="[^"]*\bkicker\b[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i, esc(`${topics[item.topic]} / ${item.category || '笔记'}`), '分类');
  html = replaceInner(html, /(<span\b[^>]*class="[^"]*\bstate\b[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i, esc(item.state), '状态');
  html = replaceInner(html, /(<div\b[^>]*class="[^"]*\btags\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/i, item.tags.map((tag) => `<span>${esc(tag)}</span>`).join(''), '标签');
  html = replaceInner(html, /(<article\b[^>]*class="[^"]*\bbody\b[^"]*"[^>]*>)([\s\S]*?)(<\/article>)/i, `\n        ${item.body.trim()}\n      `, '正文');
  if (item.related !== undefined) html = replaceInner(html, /(<aside\b[^>]*class="[^"]*\brelated\b[^"]*"[^>]*>)([\s\S]*?)(<\/aside>)/i, `\n        ${item.related.trim()}\n      `, '关联信息');
  html = replaceInner(html, /(<title>)([\s\S]*?)(<\/title>)/i, `${esc(item.title)} | Evan Speak`, '浏览器标题');
  const desc = `<meta name="description" content="${esc(item.summary)}" />`;
  html = /<meta\b[^>]*name="description"[^>]*>/i.test(html)
    ? html.replace(/<meta\b[^>]*name="description"[^>]*>/i, desc)
    : html.replace(/<title>[\s\S]*?<\/title>/i, (part) => `${part}\n    ${desc}`);
  return html;
}

function newArticle(item) {
  const topicName = topics[item.topic];
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(item.title)} | Evan Speak</title>
    <meta name="description" content="${esc(item.summary)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="icon" href="../../../../assets/brand/icons/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="../../../../assets/brand/apple-touch-icon.png" />
    <link rel="stylesheet" href="../../../../assets/article.css" />
  </head>
  <body data-topic="${item.topic}">
    <main class="page">
      <nav class="crumbs reveal" aria-label="面包屑导航"><a href="../../../../">Evan Speak</a><span>/</span><a href="../../">${topicName}</a><span>/</span><a href="../">相关笔记</a></nav>
      <header class="hero reveal">
        <span class="kicker">${topicName} / ${esc(item.category || '笔记')}</span>
        <h1>${esc(item.title)}</h1>
        <p class="summary">${esc(item.summary)}</p>
        <div class="meta"><span class="state">${esc(item.state)}</span><div class="tags">${item.tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</div></div>
      </header>
      <article class="body">${item.body}</article>
      <aside class="related reveal" aria-label="关联信息">${item.related ?? '<div><h2>这篇文章回应的问题</h2><p></p></div><div><h2>关联阅读</h2><p></p></div>'}</aside>
      <p class="foot reveal"><a href="../">&larr; 返回${topicName}相关笔记</a></p>
    </main>
    <script>document.querySelectorAll('.reveal').forEach((item) => item.classList.add('is-visible'));</script>
  </body>
</html>
`;
}

function validate(item) {
  if (!validKey(item.topic, item.slug)) throw new Error('主题或短链接格式无效');
  if (!String(item.title || '').trim()) throw new Error('标题不能为空');
  if (!String(item.summary || '').trim()) throw new Error('摘要不能为空');
  if (!item.special && !String(item.body || '').trim()) throw new Error('正文不能为空');
  if (item.special && !String(item.rawHtml || '').includes('<html')) throw new Error('源码不是完整 HTML 页面');
  if (!Array.isArray(item.tags)) throw new Error('标签格式无效');
}

async function listArticles() {
  const result = [];
  const pending = await pendingPaths();
  const status = pending.length ? await git('status', '--short', '--untracked-files=all', '--', ...pending) : '';
  const hasPending = (topic, slug) => pending.some((entry) => entry === `topics/${topic}/notes/${slug}` || entry === `content/hidden/${topic}/${slug}`) && (status.includes(`topics/${topic}/notes/${slug}/`) || status.includes(`content/hidden/${topic}/${slug}/`));
  for (const topic of Object.keys(topics)) {
    const folder = path.join(root, 'topics', topic, 'notes');
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !validKey(topic, entry.name)) continue;
      const html = await readIf(articlePath(topic, entry.name));
      if (!html) continue;
      const draft = await readIf(draftPath(topic, entry.name));
      const item = draft ? JSON.parse(draft) : extract(html, topic, entry.name);
      result.push({ topic, slug: entry.name, title: item.title, summary: item.summary, special: item.special, visible: true, published: true, draft: !!draft, pending: hasPending(topic, entry.name) });
    }
    const hiddenFolder = path.join(hiddenRoot, topic);
    if (existsSync(hiddenFolder)) {
      for (const entry of await readdir(hiddenFolder, { withFileTypes: true })) {
        if (!entry.isDirectory() || !validKey(topic, entry.name) || result.some((item) => item.topic === topic && item.slug === entry.name)) continue;
        const html = await readIf(hiddenPath(topic, entry.name));
        if (!html) continue;
        const draft = await readIf(draftPath(topic, entry.name));
        const item = draft ? JSON.parse(draft) : extract(html, topic, entry.name);
        result.push({ topic, slug: entry.name, title: item.title, summary: item.summary, special: item.special, visible: false, published: false, draft: !!draft, pending: hasPending(topic, entry.name) });
      }
    }
    const draftFolder = path.join(draftRoot, topic);
    if (existsSync(draftFolder)) {
      for (const name of await readdir(draftFolder)) {
        if (!name.endsWith('.json')) continue;
        const slug = name.slice(0, -5);
        if (result.some((item) => item.topic === topic && item.slug === slug)) continue;
        try {
          const item = JSON.parse(await read(path.join(draftFolder, name)));
          result.push({ topic, slug, title: item.title, summary: item.summary, special: !!item.special, visible: false, published: false, draft: true, pending: false });
        } catch { /* Ignore an incomplete local draft. */ }
      }
    }
  }
  return result;
}

async function loadArticle(topic, slug) {
  if (!validKey(topic, slug)) throw new Error('文章路径无效');
  const publicSource = await readIf(articlePath(topic, slug));
  const hiddenSource = publicSource ? null : await readIf(hiddenPath(topic, slug));
  const source = publicSource || hiddenSource;
  const draft = await readIf(draftPath(topic, slug));
  const item = draft ? JSON.parse(draft) : source ? extract(source, topic, slug) : null;
  if (!item) throw new Error('找不到文章');
  if (!item.special && item.related === undefined && source) item.related = extract(source, topic, slug).related;
  const pending = await pendingPaths();
  const articlePaths = [`topics/${topic}/notes/${slug}`, `content/hidden/${topic}/${slug}`];
  const status = pending.some((entry) => articlePaths.includes(entry)) ? await git('status', '--short', '--', ...articlePaths) : '';
  return { ...item, baseHash: item.baseHash ?? (source ? digest(source) : null), visible: !!publicSource, published: !!publicSource, draft: !!draft, pending: !!status };
}

function card(item, global) {
  const href = global ? `../topics/${item.topic}/notes/${item.slug}/` : `${item.slug}/`;
  const category = `${global ? `${topics[item.topic]} · ` : ''}${item.category || '笔记'}`;
  return `        <a class="note-card" href="${href}">
          <div class="card-head"><span class="dot" aria-hidden="true"></span>${esc(category)}</div>
          <strong>${esc(item.title)}</strong>
          <span>${esc(item.summary)}</span>
          <span class="status${item.state === '成型' || item.state === '长期有效' ? ' accent' : ''}">${esc(item.state)}</span>
        </a>`;
}

function syncCard(html, item, global, remove) {
  const href = global ? `../topics/${item.topic}/notes/${item.slug}/` : `${item.slug}/`;
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\s*<a\\b[^>]*class="note-card"[^>]*href="${escaped}"[^>]*>[\\s\\S]*?<\\/a>`, 'i');
  if (regex.test(html)) return html.replace(regex, remove ? '' : `\n${card(item, global)}`);
  if (!remove) {
    if (!/<\/section>/i.test(html)) throw new Error('笔记列表结构不完整');
    html = html.replace(/(<\/section>)/i, `\n${card(item, global)}\n      $1`);
  }
  return html;
}

function syncHome(html, item, remove) {
  const topicStart = html.indexOf(`        ${item.topic}: {`);
  const nextTopic = html.indexOf('\n        },', topicStart);
  if (topicStart < 0 || nextTopic < 0) throw new Error('首页主题数据结构不完整');
  const before = html.slice(0, topicStart);
  let block = html.slice(topicStart, nextTopic);
  const target = `topics/${item.topic}/notes/${item.slug}/`;
  const oldLine = block.split('\n').find((line) => line.includes(`href: "${target}"`));
  const note = `            { title: ${JSON.stringify(item.title)}, hint: ${JSON.stringify(`${item.category || '笔记'} · ${item.state}`)}, href: "${target}" },`;
  if (oldLine) block = block.replace(oldLine, remove ? '' : note);
  if (!remove) {
    if (!oldLine) block = block.replace(/(\n          \],?)/, `\n${note}$1`);
  }
  return before + block + html.slice(nextTopic);
}

function syncCount(html, count) {
  const regex = /(<a\b[^>]*href="notes\/"[^>]*>[\s\S]*?<span class="status accent">)(\d+ 篇)(<\/span>)/i;
  if (!regex.test(html)) throw new Error('主题文章数量结构不完整');
  return html.replace(regex, (_, open, _old, close) => `${open}${count} 篇${close}`);
}

async function updatedIndexes(item, remove) {
  const topicListFile = path.join(root, 'topics', item.topic, 'notes/index.html');
  const globalListFile = path.join(root, 'notes/index.html');
  const homeFile = path.join(root, 'index.html');
  const topicFile = path.join(root, 'topics', item.topic, 'index.html');
  const topicList = syncCard(await read(topicListFile), item, false, remove);
  const globalList = syncCard(await read(globalListFile), item, true, remove);
  const home = syncHome(await read(homeFile), item, remove);
  const count = (topicList.match(/class="note-card"/g) || []).length;
  const topicPage = syncCount(await read(topicFile), count);
  return [[topicListFile, topicList], [globalListFile, globalList], [homeFile, home], [topicFile, topicPage]];
}

async function saveDraft(item) {
  validate(item);
  await mkdir(path.dirname(draftPath(item.topic, item.slug)), { recursive: true });
  await writeFile(draftPath(item.topic, item.slug), JSON.stringify(item, null, 2) + '\n');
}

async function applyDraft(topic, slug) {
  if (!validKey(topic, slug)) throw new Error('文章路径无效');
  if (await readIf(publishCommitFile)) throw new Error('已有提交等待推送。请先完成推送，再应用新变更');
  const draft = await readIf(draftPath(topic, slug));
  if (!draft) throw new Error('请先保存草稿');
  const item = JSON.parse(draft);
  validate(item);
  const publicSource = await readIf(articlePath(topic, slug));
  const hiddenSource = await readIf(hiddenPath(topic, slug));
  if (publicSource && hiddenSource) throw new Error('文章同时存在于公开区和隐藏区，请先检查文件');
  const source = publicSource || hiddenSource;
  if (source && !item.baseHash) throw new Error('站点文章状态已变化。请重新打开文章确认后再应用。');
  if (source && item.baseHash && digest(source) !== item.baseHash) throw new Error('站点页面已被其他方式修改。请检查并重新保存草稿后再应用。');
  const html = item.special ? item.rawHtml : renderStandard(source, item);
  const final = extract(html, topic, slug);
  if (!final.title) throw new Error('成品页面缺少标题');
  const file = publicSource ? articlePath(topic, slug) : hiddenPath(topic, slug);
  const changes = publicSource
    ? await updatedIndexes({ ...item, title: final.title, summary: final.summary || item.summary, category: item.special ? final.category : item.category, state: item.special ? final.state : item.state }, false)
    : [];
  await mkdir(path.dirname(file), { recursive: true });
  const localImages = path.join(draftImagesRoot, topic, slug);
  if (existsSync(localImages)) await cp(localImages, path.join(path.dirname(file), 'images'), { recursive: true });
  await Promise.all([[file, html], ...changes].map(([target, content]) => writeFile(target, content)));
  await unlink(draftPath(topic, slug));
  await markPending(topic, slug);
}

async function setVisibility(topic, slug, visible) {
  if (!validKey(topic, slug)) throw new Error('文章路径无效');
  if (typeof visible !== 'boolean') throw new Error('可见性必须为开或关');
  if (await readIf(publishCommitFile)) throw new Error('已有提交等待推送。请先完成推送，再调整可见性');
  const publicFile = articlePath(topic, slug);
  const hiddenFile = hiddenPath(topic, slug);
  const publicSource = await readIf(publicFile);
  const hiddenSource = await readIf(hiddenFile);
  if (!publicSource && !hiddenSource) throw new Error('请先保存草稿并应用内容，再打开站点可见性');
  if (publicSource && hiddenSource) throw new Error('文章同时存在于公开区和隐藏区，请先检查文件');
  if (!!publicSource === visible) return { visible };
  const html = publicSource || hiddenSource;
  const item = extract(html, topic, slug);
  const changes = await updatedIndexes(item, !visible);
  const from = publicSource ? publicFile : hiddenFile;
  const to = visible ? publicFile : hiddenFile;
  await mkdir(path.dirname(to), { recursive: true });
  const sourceImages = path.join(path.dirname(from), 'images');
  if (existsSync(sourceImages)) await cp(sourceImages, path.join(path.dirname(to), 'images'), { recursive: true });
  await Promise.all([[to, html], ...changes].map(([target, content]) => writeFile(target, content)));
  await unlink(from);
  if (existsSync(sourceImages)) await rm(sourceImages, { recursive: true });
  await markPending(topic, slug);
  return { visible };
}

function response(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}

async function requestBody(req) {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 40_000_000) throw new Error('请求内容过大');
  }
  return JSON.parse(value);
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' };
async function serveFile(res, base, relative) {
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep) || file.includes(`${path.sep}.git${path.sep}`) || (base === root && file.includes(`${path.sep}.local-editor${path.sep}`))) return response(res, 403, { error: '不可访问' });
  let target = file;
  if (existsSync(target) && (await stat(target)).isDirectory()) target = path.join(target, 'index.html');
  const data = await readFile(target);
  response(res, 200, data, mime[path.extname(target)] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `http://127.0.0.1:${port}`) return response(res, 403, { error: '仅允许从本地工作台操作' });
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/page' && req.method === 'GET') return response(res, 200, await pageInfo(url.searchParams.get('path')));
    if (url.pathname === '/api/page/update' && req.method === 'POST') return response(res, 200, await updatePage(await requestBody(req)));
    if (url.pathname === '/api/articles' && req.method === 'GET') return response(res, 200, await listArticles());
    if (url.pathname === '/api/changes' && req.method === 'GET') return response(res, 200, await changes());
    if (url.pathname === '/api/article' && req.method === 'GET') return response(res, 200, await loadArticle(url.searchParams.get('topic'), url.searchParams.get('slug')));
    if (url.pathname === '/api/draft' && req.method === 'POST') { await saveDraft(await requestBody(req)); return response(res, 200, { ok: true }); }
    if (url.pathname === '/api/apply' && req.method === 'POST') { const { topic, slug } = await requestBody(req); await applyDraft(topic, slug); return response(res, 200, { ok: true }); }
    if (url.pathname === '/api/visibility' && req.method === 'POST') { const { topic, slug, visible } = await requestBody(req); return response(res, 200, await setVisibility(topic, slug, visible)); }
    if (url.pathname === '/api/unpublish' && req.method === 'POST') { const { topic, slug } = await requestBody(req); return response(res, 200, await setVisibility(topic, slug, false)); }
    if (url.pathname === '/api/publish' && req.method === 'POST') return response(res, 200, await publishChanges());
    if (url.pathname === '/api/image' && req.method === 'POST') {
      const { topic, slug, name, data } = await requestBody(req);
      if (!validKey(topic, slug)) throw new Error('文章路径无效');
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[name];
      if (!ext || !/^data:image\/(png|jpeg|webp);base64,/.test(data)) throw new Error('只支持 PNG、JPG、WebP 图片');
      const bytes = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
      if (bytes.length > 8_000_000) throw new Error('图片不能超过 8 MB');
      const folder = path.join(draftImagesRoot, topic, slug);
      await mkdir(folder, { recursive: true });
      const filename = `${Date.now()}.${ext}`;
      await writeFile(path.join(folder, filename), bytes);
      return response(res, 200, { src: `images/${filename}` });
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return await serveFile(res, editorRoot, 'index.html');
    if (url.pathname === '/favicon.ico') return await serveFile(res, root, 'assets/brand/icons/favicon.ico');
    if (url.pathname.startsWith('/site/')) {
      const relative = decodeURIComponent(url.pathname.slice(6)) || 'index.html';
      const image = relative.match(/^topics\/(product|ai|business|system|observe)\/notes\/([a-z0-9-]+)\/images\/([a-zA-Z0-9._-]+)$/);
      if (image && !existsSync(path.join(root, relative))) {
        const localDraftImage = path.join(draftImagesRoot, image[1], image[2], image[3]);
        if (existsSync(localDraftImage)) return await serveFile(res, draftImagesRoot, `${image[1]}/${image[2]}/${image[3]}`);
        return await serveFile(res, hiddenRoot, `${image[1]}/${image[2]}/images/${image[3]}`);
      }
      return await serveFile(res, root, relative);
    }
    return await serveFile(res, editorRoot, decodeURIComponent(url.pathname.slice(1)));
  } catch (error) {
    response(res, error.code === 'ENOENT' ? 404 : 400, { error: error.message });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Evan Speak 编辑工作台：http://127.0.0.1:${port}/`));
