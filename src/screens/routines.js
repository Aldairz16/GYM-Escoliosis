// Routines Screen — CRUD routines
import { getRoutines, createRoutine, updateRoutine, deleteRoutine, getRoutineExercises, setRoutineExercises, getExercises } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, showModal, SESSION_TYPES, CATEGORIES } from '../components/ui.js';

export async function renderRoutines() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `<h1 class="screen-title">Rutinas</h1><p class="screen-subtitle">Plantillas de entrenamiento</p>`;

    const listEl = document.createElement('div');
    s.appendChild(listEl);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-block mt-lg';
    addBtn.textContent = '+ Nueva Rutina';
    addBtn.onclick = () => showRoutineEditor();
    s.appendChild(addBtn);

    async function loadList() {
        const routines = await getRoutines();
        listEl.innerHTML = '';
        if (routines.length === 0) {
            listEl.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin rutinas. Crea tu primera plantilla.</div></div>`;
            return;
        }
        routines.forEach(r => {
            const item = document.createElement('div');
            item.className = 'card';
            item.innerHTML = `
        <div class="flex items-center justify-between mb-sm">
          <strong>${r.nombre}</strong>
          <span class="text-xs text-secondary">${r.tipo_sesion || ''}</span>
        </div>
        ${r.notas ? `<div class="text-xs text-secondary">${r.notas}</div>` : ''}
        <div class="flex gap-sm mt-md">
          <button class="btn btn-ghost btn-sm edit-btn">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm dup-btn">📋 Duplicar</button>
          <button class="btn btn-ghost btn-sm text-danger del-btn">🗑</button>
        </div>
      `;
            item.querySelector('.edit-btn').onclick = () => showRoutineEditor(r);
            item.querySelector('.dup-btn').onclick = async () => {
                const exs = await getRoutineExercises(r.id);
                const newR = await createRoutine({ nombre: r.nombre + ' (copia)', tipo_sesion: r.tipo_sesion, notas: r.notas });
                if (exs.length) await setRoutineExercises(newR.id, exs.map(e => ({ exercise_id: e.exercise_id, series_sugeridas: e.series_sugeridas, reps_sugeridas: e.reps_sugeridas, peso_objetivo_kg: e.peso_objetivo_kg, duracion_objetivo_seg: e.duracion_objetivo_seg })));
                showToast('✅ Rutina duplicada');
                loadList();
            };
            item.querySelector('.del-btn').onclick = async () => {
                if (confirm('¿Eliminar rutina?')) { await deleteRoutine(r.id); showToast('Eliminada'); loadList(); }
            };
            listEl.appendChild(item);
        });
    }

    async function showRoutineEditor(existing = null) {
        const allExercises = await getExercises();
        let routineExs = existing ? await getRoutineExercises(existing.id) : [];
        let nombre = existing?.nombre || '';
        let tipo = existing?.tipo_sesion || 'full_body';
        let notas = existing?.notas || '';

        const content = document.createElement('div');

        function renderEditor() {
            content.innerHTML = `
        <div class="input-group"><label class="input-label">Nombre</label><input class="input" id="r-name" value="${nombre}"></div>
        <div class="input-group"><label class="input-label">Tipo de sesión</label><select class="input" id="r-type">${SESSION_TYPES.map(t => `<option value="${t.value}" ${t.value === tipo ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
        <div class="input-group"><label class="input-label">Notas</label><textarea class="input" id="r-notes" rows="2">${notas}</textarea></div>
        <div class="section-label mt-lg">Ejercicios</div>
        <div id="r-exs"></div>
        <button class="btn btn-secondary btn-block btn-sm mt-md" id="add-ex-btn">+ Agregar Ejercicio</button>
        <button class="btn btn-primary btn-block btn-lg mt-lg" id="save-btn">💾 Guardar Rutina</button>
      `;

            const exList = content.querySelector('#r-exs');
            routineExs.forEach((re, idx) => {
                const ex = re.exercises || allExercises.find(e => e.id === re.exercise_id);
                const row = document.createElement('div');
                row.className = 'list-item';
                row.innerHTML = `
          <div class="list-item-body">
            <div class="flex items-center gap-sm">
                <div class="list-item-title">${ex?.nombre || 'Ejercicio'}</div>
                <button class="btn btn-ghost btn-sm text-secondary ex-opt-btn" style="padding:0">⚙️</button>
            </div>
            <div class="list-item-sub">
                ${re.series_sugeridas || 3}×${re.reps_sugeridas || 10} ${re.peso_objetivo_kg ? re.peso_objetivo_kg + 'kg' : ''}
                ${re.descanso_seg ? ` • ⏱ ${re.descanso_seg}s` : ''}
                ${re.notas ? ` • 📝` : ''}
                ${re.superset_id ? ` • 🔗 SS` : ''}
            </div>
          </div>
          <div class="flex gap-sm">
            ${idx > 0 ? `<button class="btn btn-ghost btn-sm up-btn">↑</button>` : ''}
            ${idx < routineExs.length - 1 ? `<button class="btn btn-ghost btn-sm down-btn">↓</button>` : ''}
            <button class="btn btn-ghost btn-sm text-danger rem-btn">✕</button>
          </div>
        `;
                row.querySelector('.rem-btn').onclick = () => { routineExs.splice(idx, 1); renderEditor(); };
                row.querySelector('.up-btn')?.addEventListener('click', () => { [routineExs[idx - 1], routineExs[idx]] = [routineExs[idx], routineExs[idx - 1]]; renderEditor(); });
                row.querySelector('.down-btn')?.addEventListener('click', () => { [routineExs[idx], routineExs[idx + 1]] = [routineExs[idx + 1], routineExs[idx]]; renderEditor(); });

                // Exercise options modal (RF-14, 15, 16)
                row.querySelector('.ex-opt-btn').onclick = () => {
                    const optM = document.createElement('div');
                    optM.innerHTML = `
                        <div class="input-group mb-sm"><label class="input-label">Series</label><input type="number" class="input" id="opt-sets" value="${re.series_sugeridas || 3}"></div>
                        <div class="input-group mb-sm"><label class="input-label">Reps / Segundos</label><input type="number" class="input" id="opt-reps" value="${ex?.es_resistencia ? (re.duracion_objetivo_seg || 30) : (re.reps_sugeridas || 10)}"></div>
                        <div class="input-group mb-sm"><label class="input-label">Peso Objetivo (kg)</label><input type="text" inputmode="decimal" class="input" id="opt-weight" value="${re.peso_objetivo_kg || ''}"></div>
                        <div class="input-group mb-sm"><label class="input-label">Descanso (seg)</label><input type="number" class="input" id="opt-rest" value="${re.descanso_seg || ''}" placeholder="Ej: 90"></div>
                        <div class="input-group mb-sm"><label class="input-label">Notas</label><input type="text" class="input" id="opt-notes" value="${re.notas || ''}"></div>
                        <label class="flex items-center gap-sm mt-md mb-md text-sm cursor-pointer"><input type="checkbox" id="opt-superset" ${re.superset_id ? 'checked' : ''}> Vincular al anterior (Superset)</label>
                        <button class="btn btn-primary btn-block mt-lg" id="opt-save">Guardar Cambios</button>
                        <button class="btn btn-secondary btn-block mt-sm" id="opt-replace">🔄 Cambiar Ejercicio</button>
                    `;
                    optM.querySelector('#opt-save').onclick = () => {
                        re.series_sugeridas = parseInt(optM.querySelector('#opt-sets').value) || 3;
                        if (ex?.es_resistencia) {
                            re.duracion_objetivo_seg = parseInt(optM.querySelector('#opt-reps').value) || 30;
                        } else {
                            re.reps_sugeridas = parseInt(optM.querySelector('#opt-reps').value) || 10;
                        }
                        re.peso_objetivo_kg = parseFloat(optM.querySelector('#opt-weight').value.replace(',', '.')) || null;
                        re.descanso_seg = parseInt(optM.querySelector('#opt-rest').value) || null;
                        re.notas = optM.querySelector('#opt-notes').value || null;
                        re.superset_id = optM.querySelector('#opt-superset').checked ? (idx > 0 ? (routineExs[idx - 1].superset_id || 'ss_' + idx) : null) : null;

                        document.querySelector('.modal-overlay')?.remove();
                        renderEditor();
                    };
                    optM.querySelector('#opt-replace').onclick = () => {
                        document.querySelector('.modal-overlay')?.remove();
                        // open picker to replace
                        content.querySelector('#add-ex-btn').onclick(idx); // hijack add to replace
                    };
                    showModal({ title: 'Configurar Ejercicio', content: optM });
                };

                exList.appendChild(row);
            });

            content.querySelector('#add-ex-btn').onclick = (replaceIdx = null) => {
                const picker = document.createElement('div');
                let pickerCat = null;

                function renderPicker() {
                    picker.innerHTML = '';

                    // Category chips
                    const chips = document.createElement('div');
                    chips.className = 'chip-group mb-md';
                    const allChip = document.createElement('button');
                    allChip.className = 'chip' + (!pickerCat ? ' active' : '');
                    allChip.textContent = 'Todos';
                    allChip.onclick = () => { pickerCat = null; renderPicker(); };
                    chips.appendChild(allChip);
                    CATEGORIES.forEach(c => {
                        const ch = document.createElement('button');
                        ch.className = 'chip' + (pickerCat === c.value ? ' active' : '');
                        ch.textContent = c.label;
                        ch.onclick = () => { pickerCat = c.value; renderPicker(); };
                        chips.appendChild(ch);
                    });
                    picker.appendChild(chips);

                    // Search bar
                    const search = document.createElement('input');
                    search.className = 'input mb-md';
                    search.placeholder = '🔍 Buscar ejercicio...';
                    search.oninput = () => {
                        const q = search.value.toLowerCase();
                        picker.querySelectorAll('.ex-pick').forEach(it => {
                            it.style.display = it.dataset.name.includes(q) ? '' : 'none';
                        });
                    };
                    picker.appendChild(search);

                    // Exercise list
                    const filtered = allExercises.filter(e => !pickerCat || e.categoria === pickerCat);
                    filtered.forEach(ex => {
                        const it = document.createElement('div');
                        it.className = 'list-item ex-pick';
                        it.dataset.name = ex.nombre.toLowerCase();
                        it.innerHTML = `<div class="list-item-body"><div class="list-item-title">${ex.nombre}</div><div class="list-item-sub">${ex.categoria}${ex.es_resistencia ? ' • ⏱ resistencia' : ''}</div></div>`;
                        it.onclick = () => {
                            const newExObj = { exercise_id: ex.id, exercises: ex, series_sugeridas: 3, reps_sugeridas: ex.es_resistencia ? null : 10, duracion_objetivo_seg: ex.es_resistencia ? 30 : null };
                            if (typeof replaceIdx === 'number') {
                                routineExs[replaceIdx] = { ...routineExs[replaceIdx], ...newExObj };
                            } else {
                                routineExs.push(newExObj);
                            }
                            // Using next sibling traversal if multiple modals
                            document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
                            renderEditor();
                        };
                        picker.appendChild(it);
                    });
                }
                renderPicker();
                showModal({ title: typeof replaceIdx === 'number' ? 'Reemplazar Ejercicio' : 'Seleccionar Ejercicio', content: picker });
            };

            content.querySelector('#save-btn').onclick = async () => {
                nombre = content.querySelector('#r-name').value;
                tipo = content.querySelector('#r-type').value;
                notas = content.querySelector('#r-notes').value;
                if (!nombre) return showToast('❌ Nombre requerido');
                try {
                    let r;
                    if (existing) {
                        r = await updateRoutine(existing.id, { nombre, tipo_sesion: tipo, notas });
                    } else {
                        r = await createRoutine({ nombre, tipo_sesion: tipo, notas });
                    }
                    await setRoutineExercises(r.id, routineExs.map(e => ({
                        exercise_id: e.exercise_id, series_sugeridas: e.series_sugeridas || 3,
                        reps_sugeridas: e.reps_sugeridas, peso_objetivo_kg: e.peso_objetivo_kg,
                        duracion_objetivo_seg: e.duracion_objetivo_seg,
                        descanso_seg: e.descanso_seg || null,
                        notas: e.notas || null
                    })));
                    document.querySelector('.modal-overlay')?.remove();
                    showToast('✅ Rutina guardada');
                    loadList();
                } catch (e) { showToast('❌ ' + e.message); }
            };
        }
        renderEditor();
        showModal({ title: existing ? 'Editar Rutina' : 'Nueva Rutina', content });
    }

    await loadList();
    return s;
}
