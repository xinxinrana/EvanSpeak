import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, stat, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = await mkdtemp(path.join(tmpdir(), 'evanspeak-editor-test-'));
const remote = `${fixture}-remote.git`;
const copy = async (relative) => {
  const target = path.join(fixture, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(source, relative), target, { recursive: true });
};

for (const relative of [
  '.gitignore', 'index.html', 'notes/index.html',
  'topics/product/index.html', 'topics/product/notes/index.html',
  'topics/ai/index.html', 'topics/ai/notes/index.html',
  'topics/business/index.html', 'topics/business/notes/index.html',
  'topics/system/index.html', 'topics/system/notes/index.html',
  'topics/observe/index.html', 'topics/observe/notes/index.html',
  'topics/observe/notes/a-warm-croissant/index.html',
  'topics/product/notes/agentnote-devlog/index.html',
  'topics/ai/notes/feeling-to-phenomenon/index.html',
  'topics/ai/notes/feeling-to-phenomenon/content.html',
  'tools/editor/server.mjs', 'tools/editor/index.html', 'tools/editor/style.css', 'tools/editor/app.js',
]) await copy(relative);

for (const args of [
  ['init', '-b', 'main'], ['config', 'user.name', 'Editor Test'], ['config', 'user.email', 'editor@example.test'],
  ['add', '.'], ['commit', '-m', 'Fixture'],
]) execFileSync('git', args, { cwd: fixture, stdio: 'ignore' });
execFileSync('git', ['init', '--bare', remote], { cwd: fixture, stdio: 'ignore' });
execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: fixture, stdio: 'ignore' });
execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: fixture, stdio: 'ignore' });

const port = await new Promise((resolve) => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(() => resolve(chosen)); });
});
const server = spawn(process.execPath, [path.join(fixture, 'tools/editor/server.mjs')], {
  env: { ...process.env, EVANSPEAK_EDITOR_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('error', reject);
  server.stderr.once('data', (chunk) => reject(new Error(chunk.toString())));
});

const api = async (route, body) => {
  const res = await fetch(`http://127.0.0.1:${port}/api/${route}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  assert.equal(res.status, 200, data.error);
  return data;
};
const file = (relative) => readFile(path.join(fixture, relative), 'utf8');

try {
  const missing = await fetch(`http://127.0.0.1:${port}/missing.css`);
  assert.equal(missing.status, 404);
  const article = await api('article?topic=observe&slug=a-warm-croissant');
  assert.equal(article.special, false);
  const original = await file('topics/observe/notes/a-warm-croissant/index.html');
  const revised = { ...article, title: '一个热可颂的清晨', summary: '这是修改后的摘要。', body: '<p>这是一段<strong>加重</strong>的文字。</p>', tags: ['观察'] };
  await api('draft', revised);
  assert.equal(await file('topics/observe/notes/a-warm-croissant/index.html'), original, '保存草稿不能修改站点');
  await api('apply', { topic: 'observe', slug: 'a-warm-croissant' });
  assert.match(await file('topics/observe/notes/a-warm-croissant/index.html'), /一个热可颂的清晨/);
  assert.match(await file('topics/observe/notes/index.html'), /这是修改后的摘要/);
  assert.match(await file('notes/index.html'), /一个热可颂的清晨/);
  assert.match(await file('index.html'), /一个热可颂的清晨/);
  assert.match(await file('topics/observe/index.html'), /1 篇/);
  const approved = await file('topics/observe/notes/a-warm-croissant/index.html');
  await api('draft', { ...(await api('article?topic=observe&slug=a-warm-croissant')), summary: '尚未应用的草稿摘要。' });
  await api('visibility', { topic: 'observe', slug: 'a-warm-croissant', visible: false });
  assert.equal((await api('article?topic=observe&slug=a-warm-croissant')).visible, false);
  assert.equal(await file('content/hidden/observe/a-warm-croissant/article.html.txt'), approved);
  assert.match(await file('.local-editor/drafts/observe/a-warm-croissant.json'), /尚未应用的草稿摘要/);
  await assert.rejects(() => stat(path.join(fixture, 'topics/observe/notes/a-warm-croissant/index.html')));
  assert.doesNotMatch(await file('notes/index.html'), /topics\/observe\/notes\/a-warm-croissant\//);
  await api('visibility', { topic: 'observe', slug: 'a-warm-croissant', visible: true });
  assert.equal(await file('topics/observe/notes/a-warm-croissant/index.html'), approved);
  assert.match(await file('.local-editor/drafts/observe/a-warm-croissant.json'), /尚未应用的草稿摘要/);
  await api('apply', { topic: 'observe', slug: 'a-warm-croissant' });
  assert.match(await file('topics/observe/notes/a-warm-croissant/index.html'), /尚未应用的草稿摘要/);
  const changes = await api('changes');
  assert.equal(changes.branch, 'main');
  assert.ok(changes.files.some((line) => line.includes('topics/observe/notes/index.html')));
  assert.ok(changes.files.every((line) => !line.includes('tools/editor')));

  const devlog = await api('article?topic=product&slug=agentnote-devlog');
  assert.match(devlog.related, /新用户第一次打开产品时/);
  assert.match(devlog.related, /href="\.\.\/\.\.\/\.\.\/product\/notes\/agentnote-three-things\/"/);
  const revisedRelated = devlog.related
    .replace('新用户第一次打开产品时，最应该被解决的是什么。', '新用户第一次打开产品时，怎样尽快理解它的价值？')
    .replace('当天在收敛的产品主线', '产品主线的设计取舍');
  await api('draft', { ...devlog, related: revisedRelated });
  assert.doesNotMatch(await file('topics/product/notes/agentnote-devlog/index.html'), /怎样尽快理解它的价值/);
  await api('apply', { topic: 'product', slug: 'agentnote-devlog' });
  const revisedDevlog = await file('topics/product/notes/agentnote-devlog/index.html');
  assert.match(revisedDevlog, /怎样尽快理解它的价值/);
  assert.match(revisedDevlog, /产品主线的设计取舍/);
  assert.match(revisedDevlog, /href="\.\.\/\.\.\/\.\.\/product\/notes\/agentnote-three-things\/"/);

  const special = await api('article?topic=ai&slug=feeling-to-phenomenon');
  assert.equal(special.special, true);
  special.rawHtml = special.rawHtml.replace('下滑进入原始页面', '继续阅读原始页面');
  await api('draft', special);
  await api('apply', { topic: 'ai', slug: 'feeling-to-phenomenon' });
  assert.match(await file('topics/ai/notes/feeling-to-phenomenon/index.html'), /继续阅读原始页面/);

  await api('publish', {});
  assert.deepEqual((await api('changes')).files, []);
  assert.equal(
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixture, encoding: 'utf8' }).trim(),
    execFileSync('git', ['rev-parse', 'main'], { cwd: remote, encoding: 'utf8' }).trim(),
    '网页确认发布应把工作台变更推送到远端',
  );

  const direct = await api('page?path=topics/product/notes/agentnote-devlog/');
  assert.equal(direct.path, 'topics/product/notes/agentnote-devlog/index.html');
  assert.equal(direct.html, await file(direct.path), '直接编辑读取历史 HTML 原文');
  const directHtml = direct.html.replace('产品主线的设计取舍', '重新检查产品主线的设计取舍');
  const directSaved = await api('page/update', { path: direct.path, html: directHtml, hash: direct.hash });
  assert.equal(await file(direct.path), directHtml, '更新 HTML 不应重建历史页面结构');
  assert.match(await file(direct.path), /重新检查产品主线的设计取舍/);
  const changedSummary = directSaved.html.replace(/(<p class="summary">)[^<]+/, '$1直接编辑后的新摘要。');
  await api('page/update', { path: direct.path, html: changedSummary, hash: directSaved.hash });
  assert.match(await file('notes/index.html'), /直接编辑后的新摘要/);
  assert.match(await file('topics/product/notes/index.html'), /直接编辑后的新摘要/);

  const specialPage = await api('page?path=topics/ai/notes/feeling-to-phenomenon/');
  const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
  const specialUpdate = await api('page/update', { path: specialPage.path, hash: specialPage.hash, html: specialPage.html.replace('</body>', `<img src="${imageData}" alt="示意图"></body>`) });
  assert.match(specialUpdate.html, /src="images\/\d+-0\.png"/);
  await stat(path.join(fixture, 'topics/ai/notes/feeling-to-phenomenon/images', specialUpdate.html.match(/images\/(\d+-0\.png)/)[1]));
  assert.equal((await api('page?path=index.html')).path, 'index.html');
  const invalidPage = await fetch(`http://127.0.0.1:${port}/api/page?path=${encodeURIComponent('tools/editor/index.html')}`);
  assert.equal(invalidPage.status, 400);

  const aiHtml = path.join(fixture, 'topics/ai/notes/feeling-to-phenomenon/content.html');
  await writeFile(aiHtml, (await readFile(aiHtml, 'utf8')) + '\n<!-- agent edited this HTML directly -->\n');
  assert.ok((await api('changes')).files.some((line) => line.includes('content.html')), 'AI 直接修改的站点 HTML 也应出现在推送清单');
  await api('publish', {});
  assert.deepEqual((await api('changes')).files, []);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixture, encoding: 'utf8' }).trim(), execFileSync('git', ['rev-parse', 'main'], { cwd: remote, encoding: 'utf8' }).trim());

  const stalePage = await api('page?path=topics/product/notes/agentnote-devlog/');
  await writeFile(path.join(fixture, stalePage.path), stalePage.html + '\n<!-- another edit -->\n');
  const directConflict = await fetch(`http://127.0.0.1:${port}/api/page/update`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: stalePage.path, html: stalePage.html, hash: stalePage.hash }) });
  assert.equal(directConflict.status, 400, '外部 HTML 修改不能被工作台覆盖');

  const conflict = await api('article?topic=observe&slug=a-warm-croissant');
  await api('draft', { ...conflict, summary: '一份尚未应用的修改。' });
  const conflictFile = path.join(fixture, 'topics/observe/notes/a-warm-croissant/index.html');
  await writeFile(conflictFile, (await readFile(conflictFile, 'utf8')) + '<!-- agent edit -->\n');
  const conflictResponse = await fetch(`http://127.0.0.1:${port}/api/apply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'observe', slug: 'a-warm-croissant' }) });
  assert.equal(conflictResponse.status, 400, '外部修改不能被静默覆盖');

  const fresh = { topic: 'observe', slug: 'new-note', title: '一篇新笔记', summary: '新的摘要。', category: '日常', state: '萌芽', tags: ['新笔记'], body: '<p>正文。</p>', special: false, rawHtml: '' };
  const image = await api('image', { topic: 'observe', slug: 'new-note', name: 'image/png', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==' });
  assert.match(image.src, /^images\/\d+\.png$/);
  await assert.rejects(() => stat(path.join(fixture, 'topics/observe/notes/new-note', image.src)), '草稿图片不能提前进入站点');
  const previewImage = await fetch(`http://127.0.0.1:${port}/site/topics/observe/notes/new-note/${image.src}`);
  assert.equal(previewImage.status, 200);
  fresh.body = `<p>正文。</p><img src="${image.src}" alt="示意图" />`;
  await api('draft', fresh);
  await api('apply', { topic: 'observe', slug: 'new-note' });
  assert.match(await file('content/hidden/observe/new-note/article.html.txt'), /一篇新笔记/);
  await assert.rejects(() => stat(path.join(fixture, 'topics/observe/notes/new-note/index.html')));
  assert.doesNotMatch(await file('index.html'), /topics\/observe\/notes\/new-note\//);
  assert.match(await file('topics/observe/index.html'), /1 篇/);
  assert.equal((await api('article?topic=observe&slug=new-note')).visible, false);
  await api('visibility', { topic: 'observe', slug: 'new-note', visible: true });
  assert.match(await file('topics/observe/notes/new-note/index.html'), /一篇新笔记/);
  await stat(path.join(fixture, 'topics/observe/notes/new-note', image.src));
  assert.match(await file('topics/observe/index.html'), /2 篇/);
  assert.match(await file('index.html'), /topics\/observe\/notes\/new-note\//);

  await api('visibility', { topic: 'observe', slug: 'new-note', visible: false });
  await assert.rejects(() => stat(path.join(fixture, 'topics/observe/notes/new-note/index.html')));
  await assert.rejects(() => stat(path.join(fixture, 'topics/observe/notes/new-note', image.src)));
  await stat(path.join(fixture, 'content/hidden/observe/new-note', image.src));
  assert.match(await file('content/hidden/observe/new-note/article.html.txt'), /一篇新笔记/);
  await assert.rejects(() => stat(path.join(fixture, '.local-editor/drafts/observe/new-note.json')));
  assert.equal((await fetch(`http://127.0.0.1:${port}/site/topics/observe/notes/new-note/${image.src}`)).status, 200);
  assert.ok((await api('articles')).some((item) => item.slug === 'new-note' && item.visible === false && item.draft === false));
  assert.doesNotMatch(await file('notes/index.html'), /topics\/observe\/notes\/new-note\//);
  assert.doesNotMatch(await file('index.html'), /topics\/observe\/notes\/new-note\//);
  assert.match(await file('topics/observe/index.html'), /1 篇/);

  await api('draft', { ...fresh, slug: 'legacy-note', title: '旧下架草稿', baseHash: 'old-public-page-hash' });
  await api('apply', { topic: 'observe', slug: 'legacy-note' });
  assert.match(await file('content/hidden/observe/legacy-note/article.html.txt'), /旧下架草稿/);
  assert.doesNotMatch(await file('index.html'), /topics\/observe\/notes\/legacy-note\//);

  const foreign = await fetch(`http://127.0.0.1:${port}/api/visibility`, { method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'observe', slug: 'a-warm-croissant', visible: false }) });
  assert.equal(foreign.status, 403);
  const chromePath = process.env.CHROME_BINARY || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (typeof WebSocket === 'function' && await access(chromePath).then(() => true, () => false)) {
    const debugPort = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(() => resolve(chosen)); });
    });
    const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + path.join(fixture, 'chrome-profile'), 'about:blank'], { stdio: 'ignore' });
    let socket;
    try {
      let target;
      for (let attempt = 0; attempt < 60; attempt++) {
        try {
          const tabs = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
          target = tabs.find((tab) => tab.type === 'page');
          if (target) break;
        } catch { /* Chrome is starting. */ }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(target, 'Chrome should expose a page target');
      socket = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
      let nextId = 0;
      const pending = new Map();
      socket.addEventListener('message', (event) => {
        const value = JSON.parse(event.data);
        if (!value.id) return;
        const request = pending.get(value.id);
        pending.delete(value.id);
        if (value.error) request.reject(new Error(value.error.message));
        else request.resolve(value.result);
      });
      const command = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
      const evaluate = async (expression) => {
        const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
      };
      await command('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' });
      for (let attempt = 0; attempt < 60; attempt++) {
        if (await evaluate('document.readyState === "complete" && !!document.querySelector("#openButton")')) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await evaluate('document.querySelector("#urlInput").value = "http://127.0.0.1:' + port + '/site/topics/observe/notes/a-warm-croissant/"; document.querySelector("#openButton").click()');
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        ready = await evaluate('!!document.querySelector("#pageFrame").contentDocument?.querySelector("article.body p") && document.querySelector("#pageFrame").contentDocument.body.isContentEditable');
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(ready, '完整历史页面应在 iframe 中可编辑');
      const beforeBrowser = await file('topics/observe/notes/a-warm-croissant/index.html');
      await evaluate('document.querySelector("#pageFrame").contentDocument.querySelector("article.body p").textContent = "浏览器页面编辑测试"; document.querySelector("#pageFrame").contentDocument.body.dispatchEvent(new Event("input", { bubbles: true })); document.querySelector("#updateButton").click()');
      let saved = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        saved = (await file('topics/observe/notes/a-warm-croissant/index.html')).includes('浏览器页面编辑测试');
        if (saved) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(saved, '浏览器中的直接编辑应写回原 HTML 文件');
      const afterBrowser = await file('topics/observe/notes/a-warm-croissant/index.html');
      assert.doesNotMatch(afterBrowser, /id="editor-base"|id="editor-style"|contenteditable="true"/);
      assert.equal(afterBrowser.split('<article class="body">')[0], beforeBrowser.split('<article class="body">')[0], '可视编辑应保留原 HTML 的页头');
      assert.equal(afterBrowser.split('</article>')[1], beforeBrowser.split('</article>')[1], '可视编辑应保留原 HTML 的脚本和页尾');
      for (let attempt = 0; attempt < 60; attempt++) {
        if (await evaluate('document.querySelector("#pageFrame").contentDocument.body.isContentEditable && document.querySelector("#dirtyBadge").hidden')) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await evaluate('(() => { const doc = document.querySelector("#pageFrame").contentDocument; const img = doc.createElement("img"); img.src = "' + imageData + '"; doc.querySelector("article.body").append(img); doc.body.dispatchEvent(new Event("input", { bubbles: true })); document.querySelector("#updateButton").click(); })()');
      let imageSaved = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        imageSaved = /src="images\/\d+-0\.png"/.test(await file('topics/observe/notes/a-warm-croissant/index.html'));
        if (imageSaved) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(imageSaved, '页面内插入的图片应写入原文章目录');
    } finally {
      socket?.close();
      chrome.kill();
    }
  }
  console.log('编辑工作台测试通过：直接读取和更新历史 HTML、图片、特殊页面、Git 推送、外部修改冲突及兼容旧草稿。');
} finally {
  server.kill();
}
