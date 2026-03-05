// Workout Registration Screen
import { addEntrenamiento, getAllEjercicios, addEjercicio, addSerie, getEntrenamientosByFecha, getSeriesByEntrenamiento, deleteEntrenamiento } from '../db/operations.js';
import { createSlider, createSelect, createInputGroup, createTextarea, createChipGroup, showToast, todayISO, nowTime, formatDateShort, createModal } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderWorkout() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    // Tab bar: New workout vs history
    screen.innerHTML = `
    <h1 class="screen-title">Entrenamiento</h1>
    <div class="tab-bar">
      <button class="tab active" data-tab="nuevo">Nuevo</button>
      <button class="tab" data-tab="historial">Historial</button>
    </div>
    <div id="tab-content"></div>
  `;

    const tabContent = screen.querySelector('#tab-content');

    function switchTab(tab) {
        screen.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'nuevo') renderNewWorkout(tabContent);
        else renderWorkoutHistory(tabContent);
    }

    screen.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    switchTab('nuevo');
    return screen;
}

async function renderNewWorkout(container) {
    container.innerHTML = '';
    const form = document.createElement('div');

    // Date & time
    const today = todayISO();
    form.appendChild(createInputGroup({ label: 'Fecha', type: 'date', id: 'ent-fecha', value: today }));
    form.appendChild(createInputGroup({ label: 'Hora inicio', type: 'time', id: 'ent-hora', value: nowTime() }));
    form.appendChild(createInputGroup({ label: 'Duración (min)', type: 'number', id: 'ent-duracion', value: '60', min: 1 }));

    // Session type
    const typeLabel = document.createElement('p');
    typeLabel.className = 'input-label';
    typeLabel.textContent = 'Tipo de sesión';
    form.appendChild(typeLabel);

    let selectedType = 'fuerza_tren_inferior';
    const typeChips = createChipGroup({
        id: 'ent-tipo',
        selected: selectedType,
        onSelect: (v) => { selectedType = v; },
        options: [
            { label: '🦵 Tren Inferior', value: 'fuerza_tren_inferior' },
            { label: '💪 Tren Superior', value: 'fuerza_tren_superior' },
            { label: '🏋️ Full Body', value: 'full_body' },
            { label: '🧘 Movilidad', value: 'movilidad' },
            { label: '🚶 Caminata', value: 'caminata_larga' },
            { label: '📝 Otro', value: 'otro' },
        ]
    });
    form.appendChild(typeChips);

    // RPE & Pain
    form.appendChild(createSlider({ label: 'Esfuerzo percibido (RPE)', min: 1, max: 10, value: 5, id: 'ent-rpe' }));
    form.appendChild(createSlider({ label: 'Dolor espalda durante', min: 0, max: 10, value: 0, id: 'ent-dolor' }));
    form.appendChild(createTextarea({ label: 'Notas', id: 'ent-notas', placeholder: 'Observaciones de la sesión...' }));

    // Exercises section
    const exerciseSection = document.createElement('div');
    exerciseSection.innerHTML = `
    <div class="divider"></div>
    <div class="flex justify-between items-center mb-md">
      <h3 class="section-title" style="margin:0">Ejercicios</h3>
      <button class="btn btn-ghost btn-sm" id="add-exercise-btn">+ Agregar</button>
    </div>
    <div id="exercises-list"></div>
  `;
    form.appendChild(exerciseSection);

    // Track exercises and sets
    const exercises = []; // Array of { ejercicio, sets: [{ peso, reps, duracion, obs }] }

    const exercisesList = exerciseSection.querySelector('#exercises-list');

    function renderExercises() {
        exercisesList.innerHTML = '';
        if (exercises.length === 0) {
            exercisesList.innerHTML = '<div class="empty-state"><p class="text-sm text-muted">Agrega ejercicios a tu sesión</p></div>';
            return;
        }
        exercises.forEach((ex, exIdx) => {
            const exCard = document.createElement('div');
            exCard.className = 'card';
            exCard.innerHTML = `
        <div class="flex justify-between items-center mb-sm">
          <span class="font-bold">${ex.ejercicio.nombre}</span>
          <button class="btn btn-ghost btn-sm remove-ex" data-idx="${exIdx}" style="color: var(--accent-danger)">✕</button>
        </div>
        <div class="set-header">
          <span>Set</span><span>Kg</span><span>Reps</span><span>Seg</span><span></span>
        </div>
        <div class="sets-container" data-ex="${exIdx}"></div>
        <button class="btn btn-ghost btn-sm add-set-btn" data-ex="${exIdx}">+ Serie</button>
      `;

            const setsContainer = exCard.querySelector('.sets-container');
            ex.sets.forEach((set, setIdx) => {
                const row = document.createElement('div');
                row.className = 'set-row';
                row.innerHTML = `
          <span class="set-num">${setIdx + 1}</span>
          <input type="number" class="input set-peso" value="${set.peso}" min="0" step="0.5" inputmode="decimal" />
          <input type="number" class="input set-reps" value="${set.reps}" min="0" inputmode="numeric" />
          <input type="number" class="input set-dur" value="${set.duracion}" min="0" inputmode="numeric" />
          <button class="btn-icon remove-set" data-ex="${exIdx}" data-set="${setIdx}">✕</button>
        `;
                setsContainer.appendChild(row);

                // Live update set data
                row.querySelector('.set-peso').addEventListener('change', (e) => { set.peso = parseFloat(e.target.value) || 0; });
                row.querySelector('.set-reps').addEventListener('change', (e) => { set.reps = parseInt(e.target.value) || 0; });
                row.querySelector('.set-dur').addEventListener('change', (e) => { set.duracion = parseInt(e.target.value) || 0; });
                row.querySelector('.remove-set').addEventListener('click', () => {
                    ex.sets.splice(setIdx, 1);
                    renderExercises();
                });
            });

            exCard.querySelector('.add-set-btn').addEventListener('click', () => {
                const lastSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : { peso: 0, reps: 10, duracion: 0 };
                ex.sets.push({ peso: lastSet.peso, reps: lastSet.reps, duracion: 0, observaciones: '' });
                renderExercises();
            });

            exCard.querySelector('.remove-ex').addEventListener('click', () => {
                exercises.splice(exIdx, 1);
                renderExercises();
            });

            exercisesList.appendChild(exCard);
        });
    }

    renderExercises();

    // Add exercise button - shows modal with exercise picker
    setTimeout(() => {
        const addBtn = exerciseSection.querySelector('#add-exercise-btn');
        addBtn.addEventListener('click', async () => {
            const allExercises = await getAllEjercicios();
            const categories = [...new Set(allExercises.map(e => e.categoria))];

            const modalContent = document.createElement('div');
            modalContent.innerHTML = `
        <div class="input-group">
          <input type="text" class="input" id="exercise-search" placeholder="Buscar ejercicio..." />
        </div>
        <div id="exercise-pick-list"></div>
        <div class="divider"></div>
        <div class="input-group">
          <label class="input-label">Agregar nuevo ejercicio</label>
          <input type="text" class="input" id="new-ex-name" placeholder="Nombre del ejercicio" />
        </div>
      `;

            // Category filter
            const catChips = document.createElement('div');
            catChips.className = 'chip-group mb-md';
            catChips.innerHTML = `<button class="chip active" data-cat="all">Todos</button>` +
                categories.map(c => `<button class="chip" data-cat="${c}">${c}</button>`).join('');
            modalContent.insertBefore(catChips, modalContent.querySelector('#exercise-pick-list'));

            let modal;

            const renderPickList = (filter = '', cat = 'all') => {
                const list = modalContent.querySelector('#exercise-pick-list');
                let filtered = allExercises;
                if (cat !== 'all') filtered = filtered.filter(e => e.categoria === cat);
                if (filter) filtered = filtered.filter(e => e.nombre.toLowerCase().includes(filter.toLowerCase()));

                list.innerHTML = filtered.slice(0, 20).map(e => `
          <div class="list-item exercise-pick" data-id="${e.id}">
            <div class="card-icon teal">${getCategoryEmoji(e.categoria)}</div>
            <div class="list-item-content">
              <div class="list-item-title">${e.nombre}</div>
              <div class="list-item-sub">${e.categoria}${e.lado ? ' · ' + e.lado : ''}</div>
            </div>
          </div>
        `).join('');

                list.querySelectorAll('.exercise-pick').forEach(item => {
                    item.addEventListener('click', () => {
                        const ex = allExercises.find(e => e.id === parseInt(item.dataset.id));
                        exercises.push({ ejercicio: ex, sets: [{ peso: 0, reps: 10, duracion: 0, observaciones: '' }] });
                        renderExercises();
                        modal.remove();
                    });
                });
            };

            const newExInput = modalContent.querySelector('#new-ex-name');
            newExInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' && newExInput.value.trim()) {
                    const newEx = { nombre: newExInput.value.trim(), categoria: 'otro', lado: 'bilateral' };
                    const id = await addEjercicio(newEx);
                    newEx.id = id;
                    exercises.push({ ejercicio: newEx, sets: [{ peso: 0, reps: 10, duracion: 0, observaciones: '' }] });
                    renderExercises();
                    modal.remove();
                }
            });

            modal = createModal({ title: 'Seleccionar Ejercicio', content: modalContent });

            // Search
            modalContent.querySelector('#exercise-search').addEventListener('input', (e) => {
                const activeCat = catChips.querySelector('.chip.active')?.dataset.cat || 'all';
                renderPickList(e.target.value, activeCat);
            });

            // Category filter
            catChips.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    catChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    renderPickList(modalContent.querySelector('#exercise-search').value, chip.dataset.cat);
                });
            });

            renderPickList();
        });
    }, 0);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
    saveBtn.textContent = '💾 Guardar Entrenamiento';
    saveBtn.addEventListener('click', async () => {
        const fecha = form.querySelector('#ent-fecha').value;
        const hora = form.querySelector('#ent-hora').value;
        const duracion = parseInt(form.querySelector('#ent-duracion').value) || 0;
        const rpe = parseInt(form.querySelector('#ent-rpe').value);
        const dolor = parseInt(form.querySelector('#ent-dolor').value);
        const notas = form.querySelector('#ent-notas').value;

        const entId = await addEntrenamiento({
            fecha, hora, tipo: selectedType,
            duracion_min: duracion,
            percepcion_esfuerzo_rpe: rpe,
            dolor_espalda_durante: dolor,
            notas
        });

        // Save series
        for (const ex of exercises) {
            for (let i = 0; i < ex.sets.length; i++) {
                const s = ex.sets[i];
                await addSerie({
                    id_entrenamiento: entId,
                    id_ejercicio: ex.ejercicio.id,
                    nombre_ejercicio: ex.ejercicio.nombre,
                    serie_numero: i + 1,
                    peso_kg: s.peso,
                    repeticiones: s.reps,
                    duracion_seg: s.duracion,
                    observaciones: s.observaciones || ''
                });
            }
        }

        showToast('✅ Entrenamiento guardado');
        navigate('/');
    });
    form.appendChild(saveBtn);

    container.appendChild(form);
}

async function renderWorkoutHistory(container) {
    container.innerHTML = '';
    const all = (await (await import('../db/operations.js')).getAllEntrenamientos()).sort((a, b) => b.fecha.localeCompare(a.fecha));

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏋️</div><p class="empty-state-text">Aún no hay entrenamientos registrados</p></div>';
        return;
    }

    for (const ent of all.slice(0, 30)) {
        const series = await getSeriesByEntrenamiento(ent.id);
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="font-bold">${formatTypeLabel(ent.tipo)}</span>
          <p class="text-xs text-secondary">${formatDateShort(ent.fecha)} · ${ent.duracion_min} min</p>
        </div>
        <div class="flex gap-sm items-center">
          <span class="badge badge-teal">RPE ${ent.percepcion_esfuerzo_rpe}</span>
          ${ent.dolor_espalda_durante > 0 ? `<span class="badge badge-red">Dolor ${ent.dolor_espalda_durante}</span>` : ''}
        </div>
      </div>
      ${series.length ? `
        <div class="mt-sm">
          <p class="text-xs text-muted">${series.map(s => s.nombre_ejercicio).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</p>
        </div>
      ` : ''}
      ${ent.notas ? `<p class="text-xs text-secondary mt-sm">${ent.notas}</p>` : ''}
      <button class="btn btn-ghost btn-sm mt-sm delete-ent" data-id="${ent.id}" style="color: var(--accent-danger)">Eliminar</button>
    `;

        item.querySelector('.delete-ent').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar este entrenamiento?')) {
                await deleteEntrenamiento(ent.id);
                showToast('Entrenamiento eliminado');
                renderWorkoutHistory(container);
            }
        });

        container.appendChild(item);
    }
}

function getCategoryEmoji(cat) {
    const map = { pierna: '🦵', espalda: '🔙', pecho: '🫁', hombro: '💪', core: '🎯', movilidad: '🧘', cardio: '🏃', otro: '📝' };
    return map[cat] || '💪';
}

function formatTypeLabel(type) {
    const map = {
        fuerza_tren_inferior: '🦵 Tren Inferior',
        fuerza_tren_superior: '💪 Tren Superior',
        full_body: '🏋️ Full Body',
        movilidad: '🧘 Movilidad',
        caminata_larga: '🚶 Caminata',
        otro: '📝 Otro'
    };
    return map[type] || type;
}
