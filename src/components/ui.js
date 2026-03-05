// Reusable UI component helpers

export function showToast(message, duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

export function createSlider({ label, min = 0, max = 10, value = 0, id, onChange }) {
    const group = document.createElement('div');
    group.className = 'slider-group';
    group.innerHTML = `
    <div class="slider-header">
      <span class="input-label">${label}</span>
      <span class="slider-value" id="${id}-value">${value}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" value="${value}" />
  `;
    const input = group.querySelector('input');
    const display = group.querySelector('.slider-value');
    input.addEventListener('input', () => {
        display.textContent = input.value;
        if (onChange) onChange(parseInt(input.value));
    });
    return group;
}

export function createInputGroup({ label, type = 'text', id, value = '', placeholder = '', min, max, step }) {
    const group = document.createElement('div');
    group.className = 'input-group';
    let attrs = `type="${type}" id="${id}" class="input" value="${value}" placeholder="${placeholder}"`;
    if (min !== undefined) attrs += ` min="${min}"`;
    if (max !== undefined) attrs += ` max="${max}"`;
    if (step !== undefined) attrs += ` step="${step}"`;
    group.innerHTML = `
    <label class="input-label" for="${id}">${label}</label>
    <input ${attrs} />
  `;
    return group;
}

export function createTextarea({ label, id, value = '', placeholder = '', rows = 3 }) {
    const group = document.createElement('div');
    group.className = 'input-group';
    group.innerHTML = `
    <label class="input-label" for="${id}">${label}</label>
    <textarea id="${id}" class="input" placeholder="${placeholder}" rows="${rows}">${value}</textarea>
  `;
    return group;
}

export function createSelect({ label, id, options, value = '' }) {
    const group = document.createElement('div');
    group.className = 'input-group';
    const optHTML = options.map(o => {
        const optVal = typeof o === 'object' ? o.value : o;
        const optLabel = typeof o === 'object' ? o.label : o;
        return `<option value="${optVal}" ${optVal === value ? 'selected' : ''}>${optLabel}</option>`;
    }).join('');
    group.innerHTML = `
    <label class="input-label" for="${id}">${label}</label>
    <select id="${id}" class="input">${optHTML}</select>
  `;
    return group;
}

export function createToggle({ label, id, checked = false }) {
    const group = document.createElement('div');
    group.className = 'toggle-group';
    group.innerHTML = `
    <span class="input-label">${label}</span>
    <label class="toggle">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} />
      <span class="toggle-slider"></span>
    </label>
  `;
    return group;
}

export function createChipGroup({ options, selected = '', id, onSelect }) {
    const group = document.createElement('div');
    group.className = 'chip-group';
    group.id = id;
    options.forEach(opt => {
        const chip = document.createElement('button');
        chip.className = `chip ${opt.value === selected ? 'active' : ''} ${opt.variant || ''}`;
        chip.textContent = opt.label;
        chip.dataset.value = opt.value;
        chip.addEventListener('click', () => {
            group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            if (onSelect) onSelect(opt.value);
        });
        group.appendChild(chip);
    });
    return group;
}

export function createProgressRing({ value, max, label, sublabel }) {
    const pct = Math.min(value / max, 1);
    const r = 50;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - pct);

    const container = document.createElement('div');
    container.className = 'progress-ring-container';
    container.innerHTML = `
    <div class="progress-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle class="bg" cx="60" cy="60" r="${r}" />
        <circle class="fg" cx="60" cy="60" r="${r}"
          stroke-dasharray="${c}"
          stroke-dashoffset="${offset}" />
      </svg>
      <div class="value">
        <span>${label}</span>
        <small>${sublabel}</small>
      </div>
    </div>
  `;
    return container;
}

export function createModal({ title, content, onClose }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-title">${title}</div>
      <div class="modal-body"></div>
    </div>
  `;
    const body = overlay.querySelector('.modal-body');
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        body.appendChild(content);
    }
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onClose) onClose();
        }
    });
    document.body.appendChild(overlay);
    return overlay;
}

export function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export function nowTime() {
    return new Date().toTimeString().slice(0, 5);
}
