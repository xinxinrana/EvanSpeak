const $ = (id) => document.getElementById(id);
let page = null;
let dirty = false;
let sourceMode = false;
let lastRange = null;

async function api(route, body) {
  const options = body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  const response = await fetch('/api/' + route, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '操作失败');
  return data;
}

function message(value, error = false) {
  $('message').textContent = value;
  $('message').classList.toggle('error', error);
}

function sitePath(value) {
  const url = new URL(value.trim(), location.href);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('请粘贴网页 URL');
  let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (relative.startsWith('site/')) relative = relative.slice(5);
  if (relative.startsWith('EvanSpeak/')) relative = relative.slice('EvanSpeak/'.length);
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  if (!relative.endsWith('.html')) relative += '/index.html';
  return relative;
}

function markDirty() {
  dirty = true;
  $('dirtyBadge').hidden = false;
  message('有尚未更新到 HTML 的修改。');
}

function documentHtml() {
  const doc = $('pageFrame').contentDocument;
  if (!doc?.documentElement) throw new Error('页面尚未加载完成');
  const root = doc.documentElement.cloneNode(true);
  root.querySelector('#editor-base')?.remove();
  root.querySelector('#editor-style')?.remove();
  root.querySelector('body').removeAttribute('contenteditable');
  const doctype = page.html.match(/<!doctype[^>]*>/i)?.[0] || '<!doctype html>';
  return doctype + '\n' + root.outerHTML;
}

function visualPatches(html) {
  const original = new DOMParser().parseFromString(page.html, 'text/html');
  const edited = new DOMParser().parseFromString(html, 'text/html');
  if (!original.querySelector('article.body')) return null;
  const selectors = ['h1', '.summary', '.kicker', '.state', '.tags', 'article.body', 'aside.related'];
  const patches = {};
  for (const selector of selectors) {
    const before = original.querySelector(selector);
    const after = edited.querySelector(selector);
    if (!!before !== !!after) return null;
    if (before && before.innerHTML !== after.innerHTML) {
      patches[selector] = after.innerHTML;
      before.innerHTML = after.innerHTML;
    }
  }
  return original.documentElement.outerHTML === edited.documentElement.outerHTML ? patches : null;
}

function renderPage(html) {
  const directory = page.path.slice(0, page.path.lastIndexOf('/') + 1);
  const base = '<base id="editor-base" href="' + location.origin + '/site/' + directory + '">';
  const style = '<style id="editor-style">.reveal{opacity:1!important;transform:none!important}body[contenteditable="true"]{outline:none}body[contenteditable="true"] :focus{outline:2px solid #63a77b;outline-offset:2px}</style>';
  $('pageFrame').srcdoc = html.replace(/<head\b[^>]*>/i, (tag) => tag + base + style);
}

function frameReady() {
  if (!page || sourceMode) return;
  const doc = $('pageFrame').contentDocument;
  if (!doc?.body) return;
  doc.body.contentEditable = 'true';
  doc.addEventListener('input', markDirty);
  doc.addEventListener('click', (event) => { if (event.target.closest('a')) event.preventDefault(); });
  doc.addEventListener('selectionchange', () => {
    const selection = doc.getSelection();
    if (selection.rangeCount && doc.body.contains(selection.anchorNode)) lastRange = selection.getRangeAt(0).cloneRange();
  });
}

async function openPage() {
  if (dirty && !confirm('当前修改尚未更新到 HTML，确定打开另一个页面吗？')) return;
  try {
    const relative = sitePath($('urlInput').value);
    page = await api('page?path=' + encodeURIComponent(relative));
    $('urlInput').value = location.origin + '/site/' + page.path.replace(/index\.html$/, '');
    $('filePath').textContent = page.path;
    $('sourceEditor').value = page.html;
    $('editorPanel').hidden = false;
    $('emptyState').hidden = true;
    sourceMode = false;
    dirty = false;
    lastRange = null;
    $('dirtyBadge').hidden = true;
    updateMode();
    renderPage(page.html);
    message('直接点击页面文字编辑；也可以切换到 HTML 源码。');
  } catch (error) { message(error.message, true); }
}

function updateMode() {
  $('pageFrame').hidden = sourceMode;
  $('sourceEditor').hidden = !sourceMode;
  $('visualButton').classList.toggle('selected', !sourceMode);
  $('sourceButton').classList.toggle('selected', sourceMode);
  $('formatTools').hidden = sourceMode;
}

function setMode(toSource) {
  if (!page || sourceMode === toSource) return;
  if (toSource) $('sourceEditor').value = dirty ? documentHtml() : page.html;
  else renderPage($('sourceEditor').value);
  sourceMode = toSource;
  updateMode();
}

function editingRange() {
  const doc = $('pageFrame').contentDocument;
  const selection = doc.getSelection();
  if (selection.rangeCount && doc.body.contains(selection.anchorNode)) return selection.getRangeAt(0);
  return lastRange;
}

function insertElement(element) {
  const doc = $('pageFrame').contentDocument;
  const range = editingRange();
  if (!range) { doc.body.append(element); markDirty(); return; }
  range.deleteContents();
  range.insertNode(element);
  range.setStartAfter(element);
  range.collapse(true);
  const selection = doc.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  lastRange = range.cloneRange();
  markDirty();
}

function wrapSelection(tag, attributes = {}) {
  const doc = $('pageFrame').contentDocument;
  const range = editingRange();
  if (!range || range.collapsed) return message('请先在页面中选中文字。', true);
  const element = doc.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.append(range.extractContents());
  insertElement(element);
}

async function addImage(file) {
  if (!file || !page) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8_000_000) return message('请选择不超过 8 MB 的 PNG、JPG 或 WebP 图片。', true);
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const image = $('pageFrame').contentDocument.createElement('img');
  image.src = data;
  image.alt = '';
  image.style.maxWidth = '100%';
  insertElement(image);
  message('图片已插入页面；点击“更新 HTML”时写入文章目录。');
}

async function updateHtml() {
  if (!page) return;
  if (!dirty) return message('页面没有需要更新的修改。');
  try {
    const html = sourceMode ? $('sourceEditor').value : documentHtml();
    const patches = sourceMode ? null : visualPatches(html);
    const updated = await api('page/update', { path: page.path, html, hash: page.hash, patches });
    page = updated;
    $('sourceEditor').value = updated.html;
    dirty = false;
    $('dirtyBadge').hidden = true;
    if (!sourceMode) renderPage(updated.html);
    message('HTML 已更新到本地文件。检查页面后即可推送上线。');
  } catch (error) { message(error.message, true); }
}

async function showPublish() {
  if (dirty) return message('请先点击“更新 HTML”，再推送线上。', true);
  try {
    const changes = await api('changes');
    if (!changes.files.length) return message('没有需要推送的站点文件。');
    $('changeList').textContent = '当前分支：' + changes.branch + '\n\n' + changes.files.join('\n');
    $('publishDialog').showModal();
  } catch (error) { message(error.message, true); }
}

async function publish() {
  $('confirmPublish').disabled = true;
  try {
    await api('publish', {});
    $('publishDialog').close();
    message('站点文件已推送到线上。');
  } catch (error) { message(error.message, true); }
  finally { $('confirmPublish').disabled = false; }
}

$('openButton').addEventListener('click', openPage);
$('urlInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') openPage(); });
$('pageFrame').addEventListener('load', frameReady);
$('visualButton').addEventListener('click', () => setMode(false));
$('sourceButton').addEventListener('click', () => setMode(true));
$('sourceEditor').addEventListener('input', markDirty);
$('updateButton').addEventListener('click', updateHtml);
$('publishButton').addEventListener('click', showPublish);
$('confirmPublish').addEventListener('click', publish);
$('cancelPublish').addEventListener('click', () => $('publishDialog').close());
$('boldButton').addEventListener('click', () => wrapSelection('strong'));
$('italicButton').addEventListener('click', () => wrapSelection('em'));
$('linkButton').addEventListener('click', () => { const href = prompt('链接地址'); if (href) wrapSelection('a', { href }); });
$('imageButton').addEventListener('click', () => $('imageInput').click());
$('imageInput').addEventListener('change', (event) => { addImage(event.target.files[0]); event.target.value = ''; });
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
