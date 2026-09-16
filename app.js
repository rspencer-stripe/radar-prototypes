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
const fieldDescription = document.getElementById('field-description');
const filterBar = document.getElementById('filter-bar');
const tagPicker = document.getElementById('tag-picker');
let activeFilter = 'All';
const fetchStatus = document.getElementById('fetch-status');
const previewThumb = document.getElementById('preview-thumb');
const previewImg = document.getElementById('preview-img');

let lastScrapedLink = '';

const DEFAULT_TAGS = ['Figma', 'Prototype', 'Resource'];

const ICONS = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
};

function getAllTags() {
  const found = new Set(DEFAULT_TAGS);
  for (const p of prototypes) {
    if (p.type) found.add(p.type);
  }
  return [...found];
}

let tagPickerAdding = false;

function selectTag(tag) {
  fieldType.value = tag;
  tagPickerAdding = false;
  renderTagPicker();
}

function renderTagPicker() {
  tagPicker.innerHTML = '';
  const selected = fieldType.value;

  for (const tag of getAllTags()) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'tag-pill' + (tag === selected ? ' active' : '');
    pill.textContent = tag;
    pill.onclick = () => selectTag(tag);
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
  const usedTags = [...new Set(prototypes.map((p) => p.type).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  filterBar.innerHTML = '';
  const allChip = document.createElement('button');
  allChip.className = 'filter-chip' + (activeFilter === 'All' ? ' active' : '');
  allChip.dataset.filter = 'All';
  allChip.textContent = 'All';
  filterBar.appendChild(allChip);

  for (const tag of usedTags) {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (activeFilter === tag ? ' active' : '');
    chip.dataset.filter = tag;
    chip.textContent = tag;
    filterBar.appendChild(chip);
  }

  if (activeFilter !== 'All' && !usedTags.includes(activeFilter)) {
    activeFilter = 'All';
  }
}

function showPreview(url) {
  if (url) {
    previewImg.src = url;
    previewThumb.hidden = false;
  } else {
    previewThumb.hidden = true;
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
    fetchStatus.textContent = data.imageUrl ? 'Preview loaded.' : 'Fetched, but no screenshot available.';
  } catch {
    fetchStatus.textContent = "Couldn't fetch a preview — you can fill in the fields manually.";
    fetchStatus.classList.add('error');
  }
}

let prototypes = [];

async function loadPrototypes() {
  if (!modalOverlay.hidden) return;
  const res = await fetch('/api/prototypes');
  const next = await res.json();
  const changed = JSON.stringify(next) !== JSON.stringify(prototypes);
  prototypes = next;
  if (changed) render();
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
  const prevRects = new Map();
  for (const el of grid.children) {
    if (el.dataset.id) prevRects.set(el.dataset.id, el.getBoundingClientRect());
  }

  grid.innerHTML = '';
  emptyState.hidden = prototypes.length > 0;
  renderFilterChips();

  const visible =
    activeFilter === 'All' ? prototypes : prototypes.filter((p) => p.type === activeFilter);

  for (const p of visible) {
    const card = document.createElement('div');
    card.className = 'card' + (p.pinned ? ' pinned' : '');
    card.dataset.id = p.id;

    const thumb = document.createElement('div');
    thumb.className = 'card-thumb' + (p.imageUrl ? '' : ' placeholder');
    if (p.imageUrl) {
      const img = document.createElement('img');
      img.src = p.imageUrl;
      img.alt = p.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = 'No preview';
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

    actions.appendChild(pinBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

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
    meta.innerHTML = `<span>${p.author}</span><span>&middot;</span><span>${formatDate(p.createdAt)}</span>`;

    body.appendChild(badge);
    body.appendChild(name);
    body.appendChild(meta);

    card.appendChild(actions);
    if (p.pinned) {
      const pinIndicator = document.createElement('div');
      pinIndicator.className = 'pin-indicator';
      pinIndicator.innerHTML = ICONS.pin;
      card.appendChild(pinIndicator);
    }
    card.appendChild(thumb);
    card.appendChild(body);

    if (p.link) {
      thumb.style.cursor = 'pointer';
      thumb.onclick = () => window.open(p.link, '_blank', 'noopener');
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

  if (prototype) {
    modalTitle.textContent = 'Edit item';
    fieldId.value = prototype.id;
    fieldName.value = prototype.name;
    fieldAuthor.value = prototype.author;
    fieldType.value = prototype.type || 'Prototype';
    fieldImage.value = prototype.imageUrl || '';
    fieldLink.value = prototype.link || '';
    fieldDescription.value = prototype.description || '';
    lastScrapedLink = prototype.link || '';
    showPreview(prototype.imageUrl);
  } else {
    modalTitle.textContent = 'Add item';
    fieldId.value = '';
    fieldType.value = 'Prototype';
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
  const payload = {
    name: fieldName.value.trim(),
    author: fieldAuthor.value,
    type: fieldType.value.trim() || 'Prototype',
    imageUrl: fieldImage.value.trim(),
    link: fieldLink.value.trim(),
    description: fieldDescription.value.trim(),
  };

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
fieldImage.addEventListener('input', () => showPreview(fieldImage.value.trim()));

filterBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-chip');
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  for (const chip of filterBar.querySelectorAll('.filter-chip')) {
    chip.classList.toggle('active', chip === btn);
  }
  render();
});

modalOverlay.hidden = true;
loadPrototypes();
setInterval(loadPrototypes, 5000);
