const grid = document.getElementById('grid');
const emptyState = document.getElementById('empty-state');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('prototype-form');

const fieldId = document.getElementById('prototype-id');
const fieldName = document.getElementById('field-name');
const fieldAuthor = document.getElementById('field-author');
const fieldType = document.getElementById('field-type');
const fieldImage = document.getElementById('field-image');
const fieldLink = document.getElementById('field-link');
const filterBar = document.getElementById('filter-bar');
const tagPicker = document.getElementById('tag-picker');
let activeFilter = 'All';
const fetchStatus = document.getElementById('fetch-status');
const previewImg = document.getElementById('preview-img');
const uploadDrop = document.getElementById('upload-drop');
const uploadFilled = document.getElementById('upload-filled');
const fieldUpload = document.getElementById('field-upload');
const uploadReplace = document.getElementById('upload-replace');
const uploadRemove = document.getElementById('upload-remove');

let lastScrapedLink = '';

let settings = { authors: [], tags: [], authorPhotos: {} };

const HANDLE_TO_NAME = {
  rspencer: 'Ryan',
  slindblad: 'Shelby',
  averette: 'Anne',
  kkoch: 'Katie',
  tkimura: 'Tara',
  cstrauss: 'Craig',
};

function resolveAuthorInput(value) {
  const handle = value.trim().replace(/^@/, '').toLowerCase();
  return HANDLE_TO_NAME[handle] || value.trim();
}

function authorInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

const AVATAR_COLORS = {
  Ryan: '#635bff',
  Shelby: '#e94b8c',
  Anne: '#00a86b',
  Katie: '#f5a623',
  Tara: '#00b8d9',
  Craig: '#3d5afe',
};

const AVATAR_PALETTE = ['#635bff', '#e94b8c', '#00a86b', '#f5a623', '#00b8d9', '#3d5afe', '#8e44ad', '#ff6b35'];

function authorColor(name) {
  if (AVATAR_COLORS[name]) return AVATAR_COLORS[name];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[Math.abs(hash)];
}

function avatarHtml(name) {
  const photo = settings.authorPhotos && settings.authorPhotos[name];
  if (photo) return `<span class="avatar avatar-photo" style="background-image:url('${photo}')"></span>`;
  return `<span class="avatar" style="background:${authorColor(name)}">${authorInitial(name)}</span>`;
}

function resizeImageToDataUrl(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setAuthorPhoto(author, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const dataUrl = await resizeImageToDataUrl(file, 96);
  const nextPhotos = { ...settings.authorPhotos, [author]: dataUrl };
  if (await saveSettings({ authorPhotos: nextPhotos })) {
    renderAuthorsList();
    render();
  }
}

const ICONS = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  figma: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2a3 3 0 0 0 0 6h3V2Z"/><path d="M11 8H8a3 3 0 1 0 3 3Z"/><path d="M11 14H8a3 3 0 1 0 3 3Z"/><path d="M14 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/><path d="M14 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  slides: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 20.5h8"/><path d="M12 17v3.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

const GOOGLE_DOC_HOSTS = ['docs.google.com', 'drive.google.com', 'sheets.google.com', 'slides.google.com'];

const DOC_HOST_ICONS = [
  { hosts: ['figma.com'], icon: 'figma', className: 'placeholder-figma' },
  { hosts: ['notion.so', 'notion.site', 'quip.com', 'dropbox.com', 'sharepoint.com', 'onedrive.live.com'], icon: 'doc', className: 'placeholder-doc' },
  { hosts: ['coda.io'], icon: 'sheet', className: 'placeholder-doc' },
];

const TYPE_PLACEHOLDER = {
  Figma: { icon: 'figma', className: 'placeholder-figma' },
  Docs: { icon: 'doc', className: 'placeholder-doc' },
  Resource: { icon: 'doc', className: 'placeholder-doc' },
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function googleDocIcon(host, link) {
  if (host.startsWith('sheets.')) return 'sheet';
  if (host.startsWith('slides.')) return 'slides';
  let pathname = '';
  try {
    pathname = new URL(link).pathname;
  } catch {
    return 'doc';
  }
  if (pathname.startsWith('/spreadsheets')) return 'sheet';
  if (pathname.startsWith('/presentation')) return 'slides';
  return 'doc';
}

function placeholderFor(prototype) {
  const link = prototype.link || '';
  const host = hostOf(link);
  if (host) {
    if (GOOGLE_DOC_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
      return { icon: googleDocIcon(host, link), className: 'placeholder-doc' };
    }
    for (const entry of DOC_HOST_ICONS) {
      if (entry.hosts.some((h) => host === h || host.endsWith('.' + h))) {
        return { icon: entry.icon, className: entry.className };
      }
    }
  }
  if (TYPE_PLACEHOLDER[prototype.type]) return TYPE_PLACEHOLDER[prototype.type];
  return prototype.link
    ? { icon: 'link', className: 'placeholder-generic' }
    : { icon: 'image', className: 'placeholder-generic' };
}

const DOC_LINK_HOSTS = [...GOOGLE_DOC_HOSTS, ...DOC_HOST_ICONS.flatMap((e) => e.hosts)];

function isDocLink(url) {
  const host = hostOf(url);
  return !!host && DOC_LINK_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

function getAllTags() {
  const found = new Set(settings.tags);
  for (const p of prototypes) {
    if (p.type) found.add(p.type);
  }
  return [...found];
}

function tagCount(tag) {
  return prototypes.filter((p) => p.type === tag).length;
}

function sortTagsByCount(tags) {
  return [...tags].sort((a, b) => tagCount(b) - tagCount(a) || a.localeCompare(b));
}

function defaultTag() {
  return sortTagsByCount(settings.tags)[0] || 'Prototype';
}

function authorCount(author) {
  return prototypes.filter((p) => p.author === author).length;
}

function sortAuthorsByCount(authors) {
  return [...authors].sort((a, b) => authorCount(b) - authorCount(a) || a.localeCompare(b));
}

let tagPickerAdding = false;
let renamingTag = null;

function selectTag(tag) {
  fieldType.value = tag;
  tagPickerAdding = false;
  if (!settings.tags.includes(tag)) {
    saveSettings({ tags: [...settings.tags, tag] }).then((ok) => {
      if (ok) {
        renderTagsList();
        renderFilterChips();
      }
    });
  }
  renderTagPicker();
}

async function renameTag(oldTag, newTag) {
  const res = await fetch('/api/tags', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldTag, newTag }),
  });
  if (!res.ok) {
    renderTagPicker();
    return;
  }
  for (const p of prototypes) {
    if (p.type === oldTag) p.type = newTag;
  }
  if (fieldType.value === oldTag) fieldType.value = newTag;
  if (settings.tags.includes(oldTag)) {
    settings.tags = settings.tags.map((t) => (t === oldTag ? newTag : t));
    renderTagsList();
  }
  renderTagPicker();
  render();
}

async function deleteTag(tag) {
  const count = prototypes.filter((p) => p.type === tag).length;
  const fallback = sortTagsByCount(settings.tags.filter((t) => t !== tag))[0] || 'Prototype';
  if (
    count > 0 &&
    !confirm(`${count} item${count > 1 ? 's' : ''} use "${tag}". They'll be moved to "${fallback}". Delete this tag?`)
  ) {
    return;
  }

  const res = await fetch('/api/tags', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag, fallback }),
  });
  if (!res.ok) return;

  for (const p of prototypes) {
    if (p.type === tag) p.type = fallback;
  }
  if (fieldType.value === tag) fieldType.value = fallback;

  if (settings.tags.includes(tag)) {
    await saveSettings({ tags: settings.tags.filter((t) => t !== tag) });
    renderTagsList();
  }

  renderTagPicker();
  render();
}

function renderAuthorOptions() {
  const selected = fieldAuthor.value;
  fieldAuthor.innerHTML = '<option value="" disabled selected>Select an author</option>';
  for (const author of settings.authors) {
    const option = document.createElement('option');
    option.value = author;
    option.textContent = author;
    fieldAuthor.appendChild(option);
  }
  if (selected && settings.authors.includes(selected)) fieldAuthor.value = selected;
}

async function saveSettings(patch) {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.ok) settings = await res.json();
  return res.ok;
}

function renderAuthorsList() {
  const list = document.getElementById('authors-list');
  list.innerHTML = '';
  for (const author of sortAuthorsByCount(settings.authors)) {
    const pill = document.createElement('span');
    pill.className = 'settings-pill';

    const avatarBtn = document.createElement('button');
    avatarBtn.type = 'button';
    avatarBtn.className = 'avatar-upload-btn';
    avatarBtn.innerHTML = avatarHtml(author);
    avatarBtn.setAttribute('aria-label', `Change photo for ${author}`);
    avatarBtn.title = 'Click to set a photo';
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.accept = 'image/*';
    photoInput.hidden = true;
    photoInput.addEventListener('change', () => setAuthorPhoto(author, photoInput.files[0]));
    avatarBtn.appendChild(photoInput);
    avatarBtn.onclick = (e) => {
      e.stopPropagation();
      photoInput.click();
    };
    pill.appendChild(avatarBtn);

    const label = document.createElement('span');
    label.textContent = author;
    pill.appendChild(label);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'settings-pill-remove';
    remove.innerHTML = '&times;';
    remove.setAttribute('aria-label', `Remove ${author}`);
    remove.onclick = async () => {
      const next = settings.authors.filter((a) => a !== author);
      const prevSelected = fieldAuthor.value;
      if (await saveSettings({ authors: next })) {
        renderAuthorsList();
        renderAuthorOptions();
        if (prevSelected === author) fieldAuthor.value = '';
      }
    };
    pill.appendChild(remove);
    list.appendChild(pill);
  }
}

function renderTagsList() {
  const list = document.getElementById('tags-list');
  list.innerHTML = '';
  for (const tag of sortTagsByCount(settings.tags)) {
    const pill = document.createElement('span');
    pill.className = 'settings-pill';
    pill.textContent = tag;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'settings-pill-remove';
    remove.innerHTML = '&times;';
    remove.setAttribute('aria-label', `Remove ${tag}`);
    remove.onclick = () => deleteTag(tag);
    pill.appendChild(remove);
    list.appendChild(pill);
  }
}

function renderTagPicker() {
  tagPicker.innerHTML = '';
  const selected = fieldType.value;
  const tags = getAllTags();
  if (selected && !tags.includes(selected)) tags.push(selected);

  for (const tag of tags) {
    if (renamingTag === tag) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tag-add-input';
      input.value = tag;
      const commitRename = () => {
        const value = input.value.trim();
        renamingTag = null;
        if (value && value !== tag) renameTag(tag, value);
        else renderTagPicker();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename();
        } else if (e.key === 'Escape') {
          renamingTag = null;
          renderTagPicker();
        }
      });
      input.addEventListener('blur', commitRename);
      tagPicker.appendChild(input);
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
      continue;
    }

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'tag-pill' + (tag === selected ? ' active' : '');
    pill.onclick = () => selectTag(tag);

    const label = document.createElement('span');
    label.className = 'tag-pill-label';
    label.textContent = tag;
    pill.appendChild(label);

    const editIcon = document.createElement('span');
    editIcon.className = 'tag-pill-delete';
    editIcon.innerHTML = ICONS.edit;
    editIcon.setAttribute('aria-label', `Rename ${tag}`);
    editIcon.onclick = (e) => {
      e.stopPropagation();
      renamingTag = tag;
      renderTagPicker();
    };
    pill.appendChild(editIcon);

    tagPicker.appendChild(pill);
  }

  if (tagPickerAdding) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-add-input';
    input.placeholder = 'New tag…';
    input.autofocus = true;
    const commit = () => {
      const value = input.value.trim();
      if (value) selectTag(value);
      else {
        tagPickerAdding = false;
        renderTagPicker();
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        tagPickerAdding = false;
        renderTagPicker();
      }
    });
    input.addEventListener('blur', commit);
    tagPicker.appendChild(input);
    requestAnimationFrame(() => input.focus());
  } else {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tag-pill tag-pill-add';
    addBtn.innerHTML = ICONS.plus;
    addBtn.setAttribute('aria-label', 'Add tag');
    addBtn.onclick = () => {
      tagPickerAdding = true;
      renderTagPicker();
    };
    tagPicker.appendChild(addBtn);
  }
}

function renderFilterChips() {
  const usedTags = sortTagsByCount(getAllTags());

  filterBar.innerHTML = '';

  const makeChip = (label, filter, count) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (activeFilter === filter ? ' active' : '');
    chip.dataset.filter = filter;
    chip.innerHTML = `${label}<span class="filter-chip-count">${count}</span>`;
    return chip;
  };

  filterBar.appendChild(makeChip('All', 'All', prototypes.length));

  for (const tag of usedTags) {
    filterBar.appendChild(makeChip(tag, tag, tagCount(tag)));
  }

  if (activeFilter !== 'All' && !usedTags.includes(activeFilter)) {
    activeFilter = 'All';
  }
}

function showPreview(url) {
  if (url) {
    previewImg.src = url;
    uploadFilled.hidden = false;
    uploadDrop.hidden = true;
  } else {
    uploadFilled.hidden = true;
    uploadDrop.hidden = false;
  }
}

async function scrapeLink() {
  const url = fieldLink.value.trim();
  if (!url || url === lastScrapedLink) return;

  try {
    new URL(url);
  } catch {
    return;
  }

  lastScrapedLink = url;

  if (isDocLink(url)) {
    fetchStatus.textContent = "Doc links usually block screenshots — upload one below instead.";
    return;
  }

  fetchStatus.textContent = 'Fetching preview…';
  fetchStatus.classList.remove('error');

  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error('scrape failed');
    const data = await res.json();

    if (data.name && !fieldName.value) fieldName.value = data.name;
    if (data.imageUrl) {
      fieldImage.value = data.imageUrl;
      showPreview(data.imageUrl);
    }
    fetchStatus.textContent = data.imageUrl
      ? 'Preview loaded.'
      : 'Fetched, but no screenshot available — you can upload one below.';
  } catch {
    fetchStatus.textContent = "Couldn't fetch a preview — you can fill in the fields manually or upload a screenshot.";
    fetchStatus.classList.add('error');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function applyUploadedFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const dataUrl = await readFileAsDataUrl(file);
  fieldImage.value = dataUrl;
  showPreview(dataUrl);
  fetchStatus.textContent = 'Uploaded screenshot.';
  fetchStatus.classList.remove('error');
}

fieldUpload.addEventListener('change', () => applyUploadedFile(fieldUpload.files[0]));

uploadDrop.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadDrop.classList.add('drag-over');
});
uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('drag-over'));
uploadDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadDrop.classList.remove('drag-over');
  applyUploadedFile(e.dataTransfer.files[0]);
});

let prototypes = [];
let dragId = null;
let newItemId = null;

function reorderPrototype(draggedId, targetId) {
  const fromIndex = prototypes.findIndex((p) => p.id === draggedId);
  const toIndex = prototypes.findIndex((p) => p.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;
  const [moved] = prototypes.splice(fromIndex, 1);
  prototypes.splice(prototypes.findIndex((p) => p.id === targetId), 0, moved);
  render();
  fetch('/api/prototypes/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: prototypes.map((p) => p.id) }),
  });
}

async function syncTagsFromPrototypes() {
  const missing = [...new Set(prototypes.map((p) => p.type).filter(Boolean))].filter(
    (t) => !settings.tags.includes(t)
  );
  if (!missing.length) return;
  if (await saveSettings({ tags: [...settings.tags, ...missing] })) {
    renderTagsList();
    renderFilterChips();
  }
}

async function loadPrototypes() {
  if (!modalOverlay.hidden) return;
  const res = await fetch('/api/prototypes');
  const next = await res.json();
  const changed = JSON.stringify(next) !== JSON.stringify(prototypes);
  prototypes = next;
  if (changed) render();
  if (settingsLoaded) await syncTagsFromPrototypes();
}

async function togglePin(p) {
  await fetch(`/api/prototypes/${p.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned: !p.pinned }),
  });
  await forceReload();
}

async function forceReload() {
  const res = await fetch('/api/prototypes');
  prototypes = await res.json();
  render();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function render() {
  emptyState.hidden = prototypes.length > 0;
  renderFilterChips();

  const visible =
    activeFilter === 'All' ? prototypes : prototypes.filter((p) => p.type === activeFilter);

  if (viewMode === 'table') {
    renderTableView(visible);
  } else {
    renderGridView(visible);
  }
}

function renderTableView(visible) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  for (const p of visible) {
    const row = document.createElement('tr');
    row.dataset.id = p.id;

    const nameCell = document.createElement('td');
    if (p.link) {
      const link = document.createElement('a');
      link.href = p.link;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'table-name-link';
      link.textContent = p.name;
      nameCell.appendChild(link);
    } else {
      nameCell.textContent = p.name;
    }

    const authorCell = document.createElement('td');
    authorCell.innerHTML = `${avatarHtml(p.author)}<span>${p.author}</span>`;
    authorCell.className = 'table-author-cell';

    const tagCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.textContent = p.type;
    tagCell.appendChild(badge);

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(p.createdAt);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'table-actions-cell';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'icon-btn' + (p.pinned ? ' active' : '');
    pinBtn.innerHTML = ICONS.pin;
    pinBtn.setAttribute('aria-label', p.pinned ? 'Unpin' : 'Pin');
    pinBtn.onclick = () => togglePin(p);

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.innerHTML = ICONS.edit;
    editBtn.setAttribute('aria-label', 'Edit');
    editBtn.onclick = () => openModal(p);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn danger';
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.setAttribute('aria-label', 'Delete');
    deleteBtn.onclick = () => deletePrototype(p.id);

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    actionsCell.appendChild(pinBtn);

    row.appendChild(nameCell);
    row.appendChild(authorCell);
    row.appendChild(tagCell);
    row.appendChild(dateCell);
    row.appendChild(actionsCell);
    tbody.appendChild(row);
  }
}

function renderGridView(visible) {
  const prevRects = new Map();
  for (const el of grid.children) {
    if (el.dataset.id) prevRects.set(el.dataset.id, el.getBoundingClientRect());
  }

  grid.innerHTML = '';

  const dragEnabled = activeFilter === 'All';

  for (const p of visible) {
    const card = document.createElement('div');
    card.className = 'card' + (p.pinned ? ' pinned' : '');
    card.dataset.id = p.id;
    card.dataset.pinned = p.pinned ? '1' : '0';

    const thumb = document.createElement('div');
    thumb.className = 'card-thumb' + (p.imageUrl ? '' : ' placeholder');
    if (p.imageUrl) {
      const img = document.createElement('img');
      img.src = p.imageUrl;
      img.alt = p.name;
      thumb.appendChild(img);
    } else {
      const { icon, className } = placeholderFor(p);
      thumb.classList.add(className);
      thumb.innerHTML = `<div class="placeholder-icon">${ICONS[icon]}</div>`;
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'icon-btn' + (p.pinned ? ' active' : '');
    pinBtn.innerHTML = ICONS.pin;
    pinBtn.setAttribute('aria-label', p.pinned ? 'Unpin' : 'Pin');
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      togglePin(p);
    };

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.innerHTML = ICONS.edit;
    editBtn.setAttribute('aria-label', 'Edit');
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openModal(p);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn danger';
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.setAttribute('aria-label', 'Delete');
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deletePrototype(p.id);
    };

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(pinBtn);

    const body = document.createElement('div');
    body.className = 'card-body';

    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.textContent = p.type;

    const name = document.createElement('p');
    name.className = 'card-name';
    name.textContent = p.name;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.innerHTML = `${avatarHtml(p.author)}<span>${p.author}</span><span>&middot;</span><span>${formatDate(p.createdAt)}</span>`;

    body.appendChild(badge);
    body.appendChild(name);
    body.appendChild(meta);

    card.appendChild(actions);
    card.appendChild(thumb);
    card.appendChild(body);

    if (p.link) {
      thumb.style.cursor = 'pointer';
      thumb.onclick = () => window.open(p.link, '_blank', 'noopener');
    }

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--tilt-y', `${(px - 0.5) * 10}deg`);
      card.style.setProperty('--tilt-x', `${(0.5 - py) * 10}deg`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });

    if (dragEnabled) {
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        dragId = p.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        for (const el of grid.children) el.classList.remove('drag-over');
        dragId = null;
      });
      card.addEventListener('dragover', (e) => {
        if (dragId === null || dragId === p.id) return;
        const dragged = prototypes.find((x) => x.id === dragId);
        if (!dragged || dragged.pinned !== p.pinned) return;
        e.preventDefault();
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (dragId === null || dragId === p.id) return;
        const dragged = prototypes.find((x) => x.id === dragId);
        if (!dragged || dragged.pinned !== p.pinned) return;
        reorderPrototype(dragId, p.id);
      });
    }

    grid.appendChild(card);
  }

  flipAnimate(prevRects);
}

function flipAnimate(prevRects) {
  if (!prevRects.size) return;
  for (const el of grid.children) {
    const prev = prevRects.get(el.dataset.id);
    if (!prev) {
      el.classList.add('card-enter');
      el.addEventListener('animationend', () => el.classList.remove('card-enter'), { once: true });
      continue;
    }
    const next = el.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (!dx && !dy) continue;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.35s cubic-bezier(0.2, 0, 0.2, 1)';
      el.style.transform = '';
      el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
    });
  }
}

function openModal(prototype) {
  form.reset();
  fetchStatus.textContent = '';
  fetchStatus.classList.remove('error');
  lastScrapedLink = '';
  tagPickerAdding = false;
  renamingTag = null;

  if (prototype) {
    modalTitle.textContent = 'Edit item';
    fieldId.value = prototype.id;
    fieldName.value = prototype.name;
    fieldAuthor.value = prototype.author;
    fieldType.value = prototype.type || defaultTag();
    fieldImage.value = prototype.imageUrl || '';
    fieldLink.value = prototype.link || '';
    lastScrapedLink = prototype.link || '';
    showPreview(prototype.imageUrl);
  } else {
    modalTitle.textContent = 'Add item';
    fieldId.value = '';
    fieldType.value = defaultTag();
    const lastAuthor = localStorage.getItem('lastAuthor');
    if (lastAuthor) fieldAuthor.value = lastAuthor;
    showPreview('');
  }
  renderTagPicker();
  modalOverlay.hidden = false;
  requestAnimationFrame(() => modalOverlay.classList.add('open'));
  fieldLink.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  setTimeout(() => {
    modalOverlay.hidden = true;
  }, 160);
}

async function deletePrototype(id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  const card = grid.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';
  }
  await fetch(`/api/prototypes/${id}`, { method: 'DELETE' });
  await forceReload();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await scrapeLink();
  const payload = {
    name: fieldName.value.trim(),
    author: fieldAuthor.value,
    type: fieldType.value.trim() || defaultTag(),
    imageUrl: fieldImage.value.trim(),
    link: fieldLink.value.trim(),
  };

  localStorage.setItem('lastAuthor', payload.author);

  const id = fieldId.value;
  if (id) {
    await fetch(`/api/prototypes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch('/api/prototypes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  closeModal();
  await forceReload();
});

document.getElementById('add-btn').onclick = () => openModal(null);
document.getElementById('empty-add-btn').onclick = () => openModal(null);
document.getElementById('cancel-btn').onclick = closeModal;
document.getElementById('modal-close').onclick = closeModal;
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

fieldLink.addEventListener('blur', scrapeLink);

uploadReplace.addEventListener('click', () => fieldUpload.click());
uploadRemove.addEventListener('click', () => {
  fieldImage.value = '';
  showPreview('');
  fetchStatus.textContent = '';
  fetchStatus.classList.remove('error');
});

filterBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-chip');
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  for (const chip of filterBar.querySelectorAll('.filter-chip')) {
    chip.classList.toggle('active', chip === btn);
  }
  render();
});

const cardSizeInput = document.getElementById('card-size');
const settingsGear = document.getElementById('settings-gear');
const settingsPanel = document.getElementById('settings-panel');
const GRID_GAP = 22;

const tableWrap = document.getElementById('table-wrap');
const viewToggle = document.getElementById('view-toggle');
const cardSizeSection = document.getElementById('card-size-section');
let viewMode = localStorage.getItem('viewMode') || 'grid';

function applyViewMode() {
  grid.hidden = viewMode !== 'grid';
  tableWrap.hidden = viewMode !== 'table';
  cardSizeSection.hidden = viewMode !== 'grid';
  for (const btn of viewToggle.querySelectorAll('.view-toggle-btn')) {
    btn.classList.toggle('active', btn.dataset.view === viewMode);
  }
}

viewToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-toggle-btn');
  if (!btn) return;
  viewMode = btn.dataset.view;
  localStorage.setItem('viewMode', viewMode);
  applyViewMode();
  render();
});

applyViewMode();

function applyCardColumns() {
  const containerWidth = grid.clientWidth;
  const desired = Number(cardSizeInput.value);
  const columns = Math.max(1, Math.round((containerWidth + GRID_GAP) / (desired + GRID_GAP)));
  grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
}

const savedCardSize = localStorage.getItem('cardSize');
if (savedCardSize) cardSizeInput.value = savedCardSize;
applyCardColumns();

cardSizeInput.addEventListener('input', () => {
  applyCardColumns();
  localStorage.setItem('cardSize', cardSizeInput.value);
});

window.addEventListener('resize', applyCardColumns);

function openSettingsPanel() {
  settingsPanel.hidden = false;
  requestAnimationFrame(() => settingsPanel.classList.add('open'));
}

function closeSettingsPanel() {
  settingsPanel.classList.remove('open');
  setTimeout(() => {
    settingsPanel.hidden = true;
  }, 160);
}

settingsGear.addEventListener('click', (e) => {
  e.stopPropagation();
  if (settingsPanel.hidden) openSettingsPanel();
  else closeSettingsPanel();
});

document.addEventListener('click', (e) => {
  if (!settingsPanel.hidden && !e.target.closest('#settings-dock')) closeSettingsPanel();
});

const authorsAddInput = document.getElementById('authors-add-input');
const authorsAddBtn = document.getElementById('authors-add-btn');
const tagsAddInput = document.getElementById('tags-add-input');
const tagsAddBtn = document.getElementById('tags-add-btn');

async function addAuthor() {
  const value = resolveAuthorInput(authorsAddInput.value);
  authorsAddInput.value = '';
  if (!value || settings.authors.includes(value)) return;
  if (await saveSettings({ authors: [...settings.authors, value] })) {
    renderAuthorsList();
    renderAuthorOptions();
  }
}

async function addTag() {
  const value = tagsAddInput.value.trim();
  tagsAddInput.value = '';
  if (!value || settings.tags.includes(value)) return;
  if (await saveSettings({ tags: [...settings.tags, value] })) {
    renderTagsList();
    if (!modalOverlay.hidden) renderTagPicker();
    render();
  }
}

authorsAddBtn.addEventListener('click', addAuthor);
authorsAddInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addAuthor();
  }
});

tagsAddBtn.addEventListener('click', addTag);
tagsAddInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
});

modalOverlay.hidden = true;

let settingsLoaded = false;

async function loadSettings() {
  const res = await fetch('/api/settings');
  settings = await res.json();
  settingsLoaded = true;
  renderAuthorOptions();
  renderAuthorsList();
  renderTagsList();
  render();
  await syncTagsFromPrototypes();
}

loadSettings();
loadPrototypes();
setInterval(loadPrototypes, 5000);
