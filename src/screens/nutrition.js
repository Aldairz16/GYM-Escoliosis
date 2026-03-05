// Nutrition Registration Screen
import { addAlimentacion, getAlimentacionByFecha, deleteAlimentacion, getAllAlimentacion } from '../db/operations.js';
import { createInputGroup, createTextarea, showToast, todayISO, nowTime, formatDateShort } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderNutrition() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Alimentación</span>
    </div>
    <div class="tab-bar">
      <button class="tab active" data-tab="registrar">Registrar</button>
      <button class="tab" data-tab="hoy">Hoy</button>
      <button class="tab" data-tab="historial">Historial</button>
    </div>
    <div id="nutrition-tab-content"></div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/'));
    const tabContent = screen.querySelector('#nutrition-tab-content');

    function switchTab(tab) {
        screen.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'registrar') renderNutritionForm(tabContent);
        else if (tab === 'hoy') renderTodayMeals(tabContent);
        else renderNutritionHistory(tabContent);
    }

    screen.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    switchTab('registrar');
    return screen;
}

async function renderNutritionForm(container) {
    container.innerHTML = '';
    const form = document.createElement('div');

    form.appendChild(createInputGroup({ label: 'Fecha', type: 'date', id: 'al-fecha', value: todayISO() }));
    form.appendChild(createInputGroup({ label: 'Hora', type: 'time', id: 'al-hora', value: nowTime() }));

    // Meal selector
    const mealLabel = document.createElement('p');
    mealLabel.className = 'input-label';
    mealLabel.textContent = 'Comida';
    form.appendChild(mealLabel);

    let selectedMeal = 'almuerzo';
    const mealGrid = document.createElement('div');
    mealGrid.className = 'chip-group mb-lg';
    const meals = [
        { label: '🌅 Desayuno', value: 'desayuno' },
        { label: '☀️ Almuerzo', value: 'almuerzo' },
        { label: '🌙 Cena', value: 'cena' },
        { label: '🍎 Snack', value: 'snack' },
    ];
    meals.forEach(m => {
        const chip = document.createElement('button');
        chip.className = `chip ${m.value === selectedMeal ? 'active' : ''}`;
        chip.textContent = m.label;
        chip.addEventListener('click', () => {
            mealGrid.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedMeal = m.value;
        });
        mealGrid.appendChild(chip);
    });
    form.appendChild(mealGrid);

    // Type selector
    const typeLabel = document.createElement('p');
    typeLabel.className = 'input-label';
    typeLabel.textContent = 'Tipo';
    form.appendChild(typeLabel);

    let selectedType = 'casera';
    const typeGrid = document.createElement('div');
    typeGrid.className = 'meal-type-grid';
    const types = [
        { label: '🏠 Casera', value: 'casera', variant: '' },
        { label: '🍽️ Fuera', value: 'fuera', variant: '' },
        { label: '🍔 Chatarra', value: 'chatarra', variant: 'warning' },
        { label: '🥤 Beb. Azuc.', value: 'bebida_azucarada', variant: 'warning' },
        { label: '🍺 Alcohol', value: 'alcohol', variant: 'danger' },
    ];
    types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `meal-type-btn ${t.value === selectedType ? 'active' : ''} ${t.variant}`;
        btn.textContent = t.label;
        btn.addEventListener('click', () => {
            typeGrid.querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedType = t.value;
        });
        typeGrid.appendChild(btn);
    });
    form.appendChild(typeGrid);

    form.appendChild(createTextarea({
        label: 'Descripción',
        id: 'al-notas',
        placeholder: '¿Qué comiste? (breve descripción)',
        rows: 3
    }));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
    saveBtn.textContent = '💾 Registrar Comida';
    saveBtn.addEventListener('click', async () => {
        await addAlimentacion({
            fecha: form.querySelector('#al-fecha').value,
            hora: form.querySelector('#al-hora').value,
            comida: selectedMeal,
            tipo: selectedType,
            notas: form.querySelector('#al-notas').value
        });
        showToast('✅ Comida registrada');
        form.querySelector('#al-notas').value = '';
    });
    form.appendChild(saveBtn);
    container.appendChild(form);
}

async function renderTodayMeals(container) {
    container.innerHTML = '';
    const meals = await getAlimentacionByFecha(todayISO());
    if (meals.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><p class="empty-state-text">No hay comidas registradas hoy</p></div>';
        return;
    }

    const mealOrder = { desayuno: 0, almuerzo: 1, cena: 2, snack: 3 };
    meals.sort((a, b) => (mealOrder[a.comida] ?? 9) - (mealOrder[b.comida] ?? 9));

    for (const m of meals) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="font-bold">${getMealEmoji(m.comida)} ${capitalizeFirst(m.comida)}</span>
          <p class="text-xs text-secondary">${m.hora} · ${capitalizeFirst(m.tipo)}</p>
        </div>
        <button class="btn btn-ghost btn-sm delete-meal" style="color: var(--accent-danger)">✕</button>
      </div>
      ${m.notas ? `<p class="text-sm mt-sm">${m.notas}</p>` : ''}
    `;
        card.querySelector('.delete-meal').addEventListener('click', async () => {
            await deleteAlimentacion(m.id);
            showToast('Comida eliminada');
            renderTodayMeals(container);
        });
        container.appendChild(card);
    }
}

async function renderNutritionHistory(container) {
    container.innerHTML = '';
    const all = (await getAllAlimentacion()).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><p class="empty-state-text">Sin registros de alimentación</p></div>';
        return;
    }

    // Group by date
    const grouped = {};
    for (const m of all) {
        if (!grouped[m.fecha]) grouped[m.fecha] = [];
        grouped[m.fecha].push(m);
    }

    const dates = Object.keys(grouped).slice(0, 14);
    for (const date of dates) {
        const header = document.createElement('p');
        header.className = 'section-label mt-lg';
        header.textContent = formatDateShort(date);
        container.appendChild(header);

        for (const m of grouped[date]) {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
        <div class="card-icon ${m.tipo === 'chatarra' || m.tipo === 'alcohol' ? 'orange' : 'teal'}">${getMealEmoji(m.comida)}</div>
        <div class="list-item-content">
          <div class="list-item-title">${capitalizeFirst(m.comida)} · ${capitalizeFirst(m.tipo)}</div>
          <div class="list-item-sub">${m.hora}${m.notas ? ' — ' + m.notas : ''}</div>
        </div>
      `;
            container.appendChild(item);
        }
    }
}

function getMealEmoji(meal) {
    return { desayuno: '🌅', almuerzo: '☀️', cena: '🌙', snack: '🍎' }[meal] || '🍽️';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
