const $ = (id) => document.getElementById(id);
const topicNames = { product: '产品', ai: 'AI', business: '商业', system: '自我系统', observe: '观察' };
let articles = [];
let current = null;
let sourceMode = false;
let dirty = false;
let relatedDirty = false;
let previewTimer;

async function api(route, options = {}) {
  const response = await fetch(`/api/${route}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '操作失败');
  return data;
}

function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}

function escapeHtml(text) {
  return String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function currentKey() { return current ? `${current.topic}/${current.slug}` : ''; }

async function refreshList() {
  articles = await api('articles');
  renderList();
}

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const filter = $('visibilityFilter').value;
  const visible = articles.filter((item) => `${item.title} ${topicNames[item.topic]} ${item.slug}`.toLowerCase().includes(q) && (filter === 'all' || item.visible === (filter === 'visible')));
  $('totalCount').textContent = `${articles.length} 篇`;
  $('articleList').replaceChildren();
  for (const item of visible) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `article-row${currentKey() === `${item.topic}/${item.slug}` ? ' active' : ''}`;
    row.innerHTML = `<strong>${escapeHtml(item.title || item.slug)}</strong><small><span>${topicNames[item.topic]}</span><span>·</span><span>${item.visible ? '可见' : '隐藏'}</span>${item.draft ? '<span class="draft-dot">● 草稿</span>' : ''}${item.pending ? '<span class="pending-dot">● 待同步</span>' : ''}</small>`;
    row.addEventListener('click', () => openArticle(item.topic, item.slug));
    $('articleList').append(row);
  }
}

function updateStatus() {
  $('statusBadge').textContent = current?.visible ? '本地可见' : '本地隐藏';
  $('draftBadge').classList.toggle('hidden', !current?.draft);
  $('pendingBadge').classList.toggle('hidden', !current?.pending);
  $('visibilityToggle').checked = !!current?.visible;
  $('visibilityHint').textContent = current?.visible ? '本地站点可访问；推送后线上同步。' : '本地站点不展示；文章内容仍可继续编辑。';
  $('siteButton').disabled = !current?.visible;
}

function readForm() {
  const special = !!current?.special;
  const item = {
    topic: $('topic').value,
    slug: $('slug').value.trim(),
    title: $('title').value.trim(),
    summary: $('summary').value.trim(),
    category: $('category').value.trim(),
    state: $('state').value,
    tags: $('tags').value.split(/[,，]/).map((value) => value.trim()).filter(Boolean),
    special,
    baseHash: current?.baseHash || null,
    body: special ? '' : sourceMode ? $('sourceEditor').value : $('visualEditor').innerHTML,
    related: special ? undefined : relatedDirty ? (sourceMode ? $('relatedSourceEditor').value : $('relatedEditor').innerHTML) : current?.related || '',
    rawHtml: special ? $('sourceEditor').value : current?.rawHtml || '',
  };
  return item;
}

function fillForm(item) {
  current = item;
  $('topic').value = item.topic;
  $('slug').value = item.slug;
  $('title').value = item.title || '';
  $('summary').value = item.summary || '';
  $('category').value = item.category || '';
  $('state').value = item.state || '萌芽';
  $('tags').value = (item.tags || []).join(', ');
  $('visualEditor').innerHTML = item.body || '';
  $('sourceEditor').value = item.special ? item.rawHtml || '' : item.body || '';
  $('relatedEditor').innerHTML = item.related || '';
  $('relatedSourceEditor').value = item.related || '';
  $('relatedSection').classList.toggle('hidden', !!item.special);
  $('topic').disabled = !!item.baseHash || !!item.draft;
  $('slug').disabled = !!item.baseHash || !!item.draft;
  for (const id of ['title', 'summary', 'category', 'state', 'tags']) $(id).disabled = !!item.special;
  $('workspaceTitle').textContent = item.title || '新文章';
  updateStatus();
  $('emptyState').classList.add('hidden');
  $('editorScreen').classList.remove('hidden');
  $('visualTab').disabled = !!item.special;
  sourceMode = !!item.special;
  updateMode();
  dirty = false;
  relatedDirty = false;
  renderList();
  updatePreview();
  message(item.special ? '此页使用独立版式，可在源码中编辑并预览。' : '修改仅在点击“保存草稿”后写入本机。');
}

async function openArticle(topic, slug) {
  if (dirty && !confirm('当前修改尚未保存，确定切换文章吗？')) return;
  try { fillForm(await api(`article?topic=${encodeURIComponent(topic)}&slug=${encodeURIComponent(slug)}`)); }
  catch (error) { message(error.message, true); }
}

function updateMode() {
  $('visualEditor').classList.toggle('hidden', sourceMode);
  $('sourceEditor').classList.toggle('hidden', !sourceMode);
  $('toolbar').classList.toggle('hidden', sourceMode);
  $('relatedEditor').classList.toggle('hidden', sourceMode);
  $('relatedSourceEditor').classList.toggle('hidden', !sourceMode);
  $('visualTab').classList.toggle('selected', !sourceMode);
  $('sourceTab').classList.toggle('selected', sourceMode);
  $('modeNote').textContent = current?.special ? '特殊页面使用完整 HTML 源码编辑，右侧查看实际页面。' : sourceMode ? '这里只修改正文 HTML，页面外壳会保持原样。' : '像编辑文档一样修改，右侧查看实际页面。';
}

function switchMode(toSource) {
  if (!current || (current.special && !toSource) || sourceMode === toSource) return;
  if (toSource) $('sourceEditor').value = $('visualEditor').innerHTML;
  else $('visualEditor').innerHTML = $('sourceEditor').value;
  if (toSource) $('relatedSourceEditor').value = $('relatedEditor').innerHTML;
  else $('relatedEditor').innerHTML = $('relatedSourceEditor').value;
  sourceMode = toSource;
  updateMode();
}

function previewHtml(item) {
  let html;
  if (item.special) html = item.rawHtml;
  else {
    const doc = new DOMParser().parseFromString(current?.rawHtml || '', 'text/html');
    if (!doc.querySelector('article.body')) {
      html = `<!doctype html><html><head><link rel="stylesheet" href="../../../../assets/article.css"></head><body data-topic="${item.topic}"><main class="page"><header class="hero"><span class="kicker"></span><h1></h1><p class="summary"></p><div class="meta"><span class="state"></span><div class="tags"></div></div></header><article class="body"></article><aside class="related"></aside></main></body></html>`;
    } else html = current.rawHtml;
    const page = new DOMParser().parseFromString(html, 'text/html');
    page.querySelector('h1').textContent = item.title;
    page.querySelector('.summary').textContent = item.summary;
    page.querySelector('.kicker').textContent = `${topicNames[item.topic]} / ${item.category || '笔记'}`;
    page.querySelector('.state').textContent = item.state;
    page.querySelector('.tags').replaceChildren(...item.tags.map((tag) => { const span = document.createElement('span'); span.textContent = tag; return span; }));
    page.querySelector('article.body').innerHTML = item.body;
    const related = page.querySelector('aside.related');
    if (related) related.innerHTML = item.related || '';
    html = '<!doctype html>\n' + page.documentElement.outerHTML;
  }
  const base = `<base href="${location.origin}/site/topics/${item.topic}/notes/${item.slug}/">`;
  const previewStyles = '<style>.reveal{opacity:1!important;transform:none!important}</style>';
  return html.replace(/<head[^>]*>/i, (match) => match + base + previewStyles);
}

function updatePreview() {
  if (!current) return;
  try { $('preview').srcdoc = previewHtml(readForm()); }
  catch (error) { message(`预览失败：${error.message}`, true); }
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 250);
}

async function saveDraft() {
  const item = readForm();
  try {
    await api('draft', { method: 'POST', body: JSON.stringify(item) });
    current = { ...current, ...item, draft: true };
    dirty = false;
    relatedDirty = false;
    $('topic').disabled = true;
    $('slug').disabled = true;
    updateStatus();
    await refreshList();
    updatePreview();
    message('草稿已保存在本机，站点内容尚未改变。');
    return true;
  } catch (error) { message(error.message, true); return false; }
}

async function apply() {
  if (!(await saveDraft())) return;
  if (!confirm('将草稿内容应用到本地文章？可见性不变，不会自动推送线上。')) return;
  try {
    await api('apply', { method: 'POST', body: JSON.stringify({ topic: current.topic, slug: current.slug }) });
    await refreshList();
    fillForm(await api(`article?topic=${current.topic}&slug=${current.slug}`));
    message(current.visible ? '内容已应用到本地站点，列表已同步。' : '内容已应用到隐藏文章源，站点仍不可见。');
  } catch (error) { message(error.message, true); }
}

async function changeVisibility() {
  const visible = $('visibilityToggle').checked;
  if (!current) return;
  try {
    await api('visibility', { method: 'POST', body: JSON.stringify({ topic: current.topic, slug: current.slug, visible }) });
    current.visible = visible;
    current.published = visible;
    await refreshList();
    current.pending = !!articles.find((item) => item.topic === current.topic && item.slug === current.slug)?.pending;
    updateStatus();
    message(visible ? '本地站点已显示这篇文章，推送后线上同步。' : '本地站点已隐藏这篇文章，草稿不受影响。');
  } catch (error) { $('visibilityToggle').checked = !!current.visible; message(error.message, true); }
}

async function showPublish() {
  try {
    const change = await api('changes');
    if (!change.files.length) return message('没有待推送的站点变更。');
    $('changeList').textContent = `当前分支：${change.branch}\n\n${change.files.join('\n')}`;
    $('publishDialog').showModal();
  } catch (error) { message(error.message, true); }
}

async function publish() {
  $('confirmPublish').disabled = true;
  $('confirmPublish').textContent = '正在推送…';
  try {
    await api('publish', { method: 'POST', body: '{}' });
    $('publishDialog').close();
    if (current) { current.pending = false; updateStatus(); }
    await refreshList();
    message('内容已提交并推送到 main。');
  } catch (error) { message(`推送未完成：${error.message}`, true); }
  finally { $('confirmPublish').disabled = false; $('confirmPublish').textContent = '确认提交并推送'; }
}

function command(name, value) {
  $('visualEditor').focus();
  document.execCommand(name, false, value);
  dirty = true;
  schedulePreview();
}

async function uploadImage(file) {
  if (!file || !current) return;
  if (file.size > 8_000_000) return message('图片不能超过 8 MB', true);
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  try {
    const result = await api('image', { method: 'POST', body: JSON.stringify({ topic: $('topic').value, slug: $('slug').value, name: file.type, data }) });
    command('insertHTML', `<img src="${result.src}" alt="" />`);
    message('图片已加入正文。请保存草稿。');
  } catch (error) { message(error.message, true); }
}

$('search').addEventListener('input', renderList);
$('visibilityFilter').addEventListener('change', renderList);
$('newButton').addEventListener('click', () => {
  if (dirty && !confirm('当前修改尚未保存，确定新建文章吗？')) return;
  fillForm({ topic: 'ai', slug: '', title: '', summary: '', category: '', state: '萌芽', tags: [], body: '<p></p>', related: '<div><h2>这篇文章回应的问题</h2><p></p></div><div><h2>关联阅读</h2><p></p></div>', rawHtml: '', published: false, draft: false, special: false });
  $('topic').disabled = false;
  $('slug').disabled = false;
  $('title').focus();
});
$('visualTab').addEventListener('click', () => switchMode(false));
$('sourceTab').addEventListener('click', () => switchMode(true));
$('refreshPreview').addEventListener('click', updatePreview);
$('saveButton').addEventListener('click', saveDraft);
$('applyButton').addEventListener('click', apply);
$('visibilityToggle').addEventListener('change', changeVisibility);
$('publishButton').addEventListener('click', showPublish);
$('confirmPublish').addEventListener('click', publish);
$('cancelPublish').addEventListener('click', () => $('publishDialog').close());
$('closeDialog').addEventListener('click', () => $('publishDialog').close());
$('siteButton').addEventListener('click', () => { if (current?.visible) window.open(`/site/topics/${current.topic}/notes/${current.slug}/`, '_blank'); });
document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', () => command(button.dataset.command)));
document.querySelectorAll('[data-block]').forEach((button) => button.addEventListener('click', () => command('formatBlock', `<${button.dataset.block}>`)));
document.querySelectorAll('#toolbar button').forEach((button) => button.addEventListener('mousedown', (event) => event.preventDefault()));
$('linkButton').addEventListener('click', () => { const url = prompt('链接地址'); if (url) command('createLink', url); });
$('hrButton').addEventListener('click', () => command('insertHorizontalRule'));
$('imageButton').addEventListener('click', () => $('imageInput').click());
$('imageInput').addEventListener('change', (event) => { uploadImage(event.target.files[0]); event.target.value = ''; });
['topic', 'slug', 'category', 'state', 'title', 'summary', 'tags', 'visualEditor', 'sourceEditor', 'relatedEditor', 'relatedSourceEditor'].forEach((id) => $(id).addEventListener('input', () => { dirty = true; $('workspaceTitle').textContent = $('title').value || '新文章'; schedulePreview(); }));
['relatedEditor', 'relatedSourceEditor'].forEach((id) => $(id).addEventListener('input', () => { relatedDirty = true; }));
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
refreshList().catch((error) => message(error.message, true));
