// Reusable UI components
export function showToast(msg) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

export function createSlider({ label, id, min = 0, max = 10, value = 5, onChange }) {
    const d = document.createElement('div');
    d.className = 'input-group';
    d.innerHTML = `<div class="slider-row"><span class="input-label">${label}</span><span class="slider-val" id="${id}-val">${value}</span></div><input type="range" id="${id}" min="${min}" max="${max}" value="${value}">`;
    const inp = d.querySelector('input');
    const val = d.querySelector(`#${id}-val`);
    inp.addEventListener('input', () => { val.textContent = inp.value; if (onChange) onChange(+inp.value); });
    return d;
}

export function createInput({ label, type = 'text', id, value = '', placeholder = '', min, max, step }) {
    const d = document.createElement('div');
    d.className = 'input-group';
    d.innerHTML = `<label class="input-label" for="${id}">${label}</label>`;
    const inp = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    inp.className = 'input'; inp.id = id; inp.value = value; inp.placeholder = placeholder;
    if (type !== 'textarea') inp.type = type;
    if (min !== undefined) inp.min = min;
    if (max !== undefined) inp.max = max;
    if (step) inp.step = step;
    d.appendChild(inp);
    return d;
}

export function createSelect({ label, id, options, value = '' }) {
    const d = document.createElement('div');
    d.className = 'input-group';
    d.innerHTML = `<label class="input-label" for="${id}">${label}</label>`;
    const sel = document.createElement('select');
    sel.className = 'input'; sel.id = id;
    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = typeof o === 'string' ? o : o.value;
        opt.textContent = typeof o === 'string' ? o : o.label;
        if (opt.value === value) opt.selected = true;
        sel.appendChild(opt);
    });
    d.appendChild(sel);
    return d;
}

export function createChips({ options, selected, onChange }) {
    const d = document.createElement('div');
    d.className = 'chip-group';
    options.forEach(o => {
        const chip = document.createElement('button');
        chip.className = 'chip' + (o.value === selected ? ' active' : '');
        chip.textContent = o.label;
        chip.addEventListener('click', () => {
            d.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            if (onChange) onChange(o.value);
        });
        d.appendChild(chip);
    });
    return d;
}

export function showModal({ title, content, onClose }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-handle"></div><div class="modal-title">${title}</div><div class="modal-body"></div></div>`;
    overlay.querySelector('.modal-body').appendChild(content);
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); } });
    document.body.appendChild(overlay);
    return overlay;
}

export function formatDate(d) {
    const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
    return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function nowTime() { return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }); }

export function formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SESSION_TYPES = [
    { value: 'tren_inferior', label: '🦵 Tren Inferior' },
    { value: 'tren_superior', label: '💪 Tren Superior' },
    { value: 'full_body', label: '🏋️ Full Body' },
    { value: 'movilidad', label: '🧘 Movilidad' },
    { value: 'cardio', label: '🏃 Cardio' },
    { value: 'otro', label: '📋 Otro' },
];

export function sessionTypeLabel(t) {
    return SESSION_TYPES.find(s => s.value === t)?.label || t;
}

export const CATEGORIES = [
    { value: 'pierna', label: '🦵 Pierna' }, { value: 'espalda', label: '🔙 Espalda' },
    { value: 'pecho', label: '💪 Pecho' }, { value: 'hombro', label: '🏋️ Hombro' },
    { value: 'core', label: '🎯 Core' }, { value: 'movilidad', label: '🧘 Movilidad' },
    { value: 'cardio', label: '🏃 Cardio' }, { value: 'otro', label: '📋 Otro' },
];
