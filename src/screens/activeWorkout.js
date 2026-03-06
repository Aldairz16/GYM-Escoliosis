// Active Workout Screen — live tracking with timers
import { getExercises, addSet, updateSet, deleteSet, getSessionSets, updateSession, getLastWeight, deleteSession, getConfig } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, showModal, formatTimer, createSlider, CATEGORIES } from '../components/ui.js';

let restInterval = null;
let resistanceInterval = null;
let sessionTimerInterval = null;

export async function renderActiveWorkout() {
    const s = document.createElement('div');
    s.className = 'screen';

    const sessionData = JSON.parse(localStorage.getItem('activeSession') || 'null');
    if (!sessionData) { navigate('/workout'); return s; }

    const allExercises = await getExercises();
    let sessionSets = await getSessionSets(sessionData.id);
    const routineExs = JSON.parse(localStorage.getItem('routineExercises') || '[]');
    let restTime = await getConfig('rest_timer', 60);
    const sessionStart = sessionData.hora_inicio || null;

    // Group sets by exercise
    function groupSets() {
        const groups = {};
        sessionSets.forEach(set => {
            const key = set.exercise_id || set.exercise_name;
            if (!groups[key]) {
                const ex = allExercises.find(e => e.id === set.exercise_id);
                groups[key] = { exercise: ex, name: set.exercise_name || ex?.nombre, sets: [], isResistance: ex?.es_resistencia || false };
            }
            groups[key].sets.push(set);
        });
        return Object.values(groups);
    }

    // Pre-load routine exercises as empty sets
    if (routineExs.length > 0 && sessionSets.length === 0) {
        for (const re of routineExs) {
            const ex = re.exercises || allExercises.find(e => e.id === re.exercise_id);
            if (!ex) continue;
            const numSets = re.series_sugeridas || 3;
            const lastW = await getLastWeight(ex.id);
            for (let i = 1; i <= numSets; i++) {
                const newSet = await addSet({
                    session_id: sessionData.id, exercise_id: ex.id,
                    exercise_name: ex.nombre, numero_serie: i,
                    peso_kg: re.peso_objetivo_kg || lastW || 0,
                    repeticiones: ex.es_resistencia ? null : (re.reps_sugeridas || 10),
                    duracion_seg: ex.es_resistencia ? (re.duracion_objetivo_seg || 0) : null,
                    completada: false
                });
                sessionSets.push(newSet);
            }
        }
        localStorage.removeItem('routineExercises');
    }

    // Calculate elapsed seconds
    function getElapsed() {
        if (!sessionStart) return 0;
        const [h, m] = sessionStart.split(':').map(Number);
        const now = new Date();
        const startMin = h * 60 + m;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const secs = (nowMin - startMin) * 60 + now.getSeconds();
        return secs < 0 ? secs + 86400 : secs;
    }

    function render() {
        // Clear previous session timer
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);

        s.innerHTML = '';

        // Header with back button + session timer
        const header = document.createElement('div');
        header.className = 'header-bar';
        header.innerHTML = `
          <button class="back-btn" id="back-btn">←</button>
          <span class="header-title" style="flex:1">🏋️ En curso</span>
          <span id="session-clock" class="text-sm" style="color:var(--accent);font-weight:700;font-variant-numeric:tabular-nums">${formatTimer(getElapsed())}</span>
        `;
        s.appendChild(header);

        // Session timer update
        const clockEl = header.querySelector('#session-clock');
        sessionTimerInterval = setInterval(() => {
            if (clockEl) clockEl.textContent = formatTimer(getElapsed());
        }, 1000);

        // Back button — cancel workout
        header.querySelector('#back-btn').onclick = () => {
            if (confirm('¿Salir del entrenamiento?\n\n• "Aceptar" = guardar progreso y salir\n• "Cancelar" = seguir entrenando')) {
                if (sessionTimerInterval) clearInterval(sessionTimerInterval);
                // Don't delete — just leave (user can continue from history)
                localStorage.removeItem('activeSession');
                localStorage.removeItem('routineExercises');
                navigate('/');
            }
        };

        // Rest time editor
        const restRow = document.createElement('div');
        restRow.className = 'flex items-center justify-between mb-md';
        restRow.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);padding:var(--sp-sm) var(--sp-md)';
        restRow.innerHTML = `
          <span class="text-xs text-secondary">⏱ Descanso entre series</span>
          <div class="flex items-center gap-sm">
            <button class="btn-weight" id="rest-minus">−</button>
            <span id="rest-val" style="font-weight:700;min-width:36px;text-align:center">${restTime}s</span>
            <button class="btn-weight" id="rest-plus">+</button>
          </div>
        `;
        restRow.querySelector('#rest-minus').onclick = () => { restTime = Math.max(10, restTime - 5); restRow.querySelector('#rest-val').textContent = restTime + 's'; };
        restRow.querySelector('#rest-plus').onclick = () => { restTime = Math.min(300, restTime + 5); restRow.querySelector('#rest-val').textContent = restTime + 's'; };
        s.appendChild(restRow);

        const groups = groupSets();

        if (groups.length === 0) {
            s.innerHTML += `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Agrega ejercicios a tu sesión</div></div>`;
        }

        groups.forEach(g => {
            const block = document.createElement('div');
            block.className = 'exercise-block';

            // Exercise header with info button
            const ehdr = document.createElement('div');
            ehdr.className = 'exercise-header';
            ehdr.innerHTML = `<span class="exercise-name">${g.name}</span><div class="flex gap-sm items-center">${g.isResistance ? '<span class="exercise-badge">⏱ Resistencia</span>' : ''}<button class="btn btn-ghost btn-sm ex-info-btn" title="Info y alternativas">ℹ️</button></div>`;
            ehdr.querySelector('.ex-info-btn').onclick = () => showExInfo(g.exercise);
            block.appendChild(ehdr);

            // Set headers
            const hdr = document.createElement('div');
            hdr.className = 'set-row header';
            hdr.innerHTML = `<div>Set</div><div>${g.isResistance ? 'Seg' : 'Kg'}</div><div>${g.isResistance ? '' : 'Reps'}</div><div>✓</div>`;
            block.appendChild(hdr);

            // Sets
            g.sets.forEach(set => {
                const row = document.createElement('div');
                row.className = 'set-row';
                row.innerHTML = `<div class="set-num">${set.numero_serie}</div>`;

                // Weight / Duration input
                const inp1 = document.createElement('input');
                inp1.className = 'set-input';
                inp1.type = 'number';
                inp1.inputMode = 'decimal';
                inp1.step = g.isResistance ? '1' : '0.5';
                inp1.value = g.isResistance ? (set.duracion_seg || '') : (set.peso_kg || '');
                inp1.placeholder = g.isResistance ? 'seg' : 'kg';
                inp1.onchange = () => {
                    const val = parseFloat(inp1.value) || 0;
                    updateSet(set.id, g.isResistance ? { duracion_seg: val } : { peso_kg: val });
                    set[g.isResistance ? 'duracion_seg' : 'peso_kg'] = val;
                };
                row.appendChild(inp1);

                // Reps input (or timer button for resistance)
                if (g.isResistance) {
                    const timerBtn = document.createElement('button');
                    timerBtn.className = 'btn btn-sm btn-secondary';
                    timerBtn.textContent = '⏱';
                    timerBtn.onclick = () => startResistanceTimer(set, inp1);
                    row.appendChild(timerBtn);
                } else {
                    const inp2 = document.createElement('input');
                    inp2.className = 'set-input';
                    inp2.type = 'number';
                    inp2.inputMode = 'numeric';
                    inp2.value = set.repeticiones || '';
                    inp2.placeholder = 'reps';
                    inp2.onchange = () => {
                        set.repeticiones = parseInt(inp2.value) || 0;
                        updateSet(set.id, { repeticiones: set.repeticiones });
                    };
                    row.appendChild(inp2);
                }

                // Check button
                const check = document.createElement('button');
                check.className = 'set-check' + (set.completada ? ' done' : '');
                check.textContent = set.completada ? '✓' : '○';
                check.onclick = async () => {
                    set.completada = !set.completada;
                    await updateSet(set.id, { completada: set.completada });
                    check.className = 'set-check' + (set.completada ? ' done' : '');
                    check.textContent = set.completada ? '✓' : '○';
                    if (set.completada) startRestTimer(restTime);
                };
                row.appendChild(check);
                block.appendChild(row);
            });

            // Weight quick buttons (for non-resistance)
            if (!g.isResistance) {
                const wbtns = document.createElement('div');
                wbtns.className = 'weight-btns mt-sm';
                ['+2.5', '+5', '+10'].forEach(label => {
                    const b = document.createElement('button');
                    b.className = 'btn-weight';
                    b.textContent = label;
                    b.onclick = () => {
                        const lastSet = g.sets[g.sets.length - 1];
                        const newW = (lastSet.peso_kg || 0) + parseFloat(label);
                        g.sets.forEach(async set => {
                            set.peso_kg = newW;
                            await updateSet(set.id, { peso_kg: newW });
                        });
                        render();
                    };
                    wbtns.appendChild(b);
                });
                block.appendChild(wbtns);
            }

            // Add set + delete last
            const actions = document.createElement('div');
            actions.className = 'flex gap-sm mt-md';
            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn-sm btn-ghost';
            addBtn.textContent = '+ Serie';
            addBtn.onclick = async () => {
                const lastSet = g.sets[g.sets.length - 1];
                const newSet = await addSet({
                    session_id: sessionData.id, exercise_id: lastSet.exercise_id,
                    exercise_name: lastSet.exercise_name, numero_serie: g.sets.length + 1,
                    peso_kg: lastSet.peso_kg || 0, repeticiones: lastSet.repeticiones || 0,
                    duracion_seg: lastSet.duracion_seg || 0, completada: false
                });
                sessionSets.push(newSet);
                render();
            };
            actions.appendChild(addBtn);

            const delLast = document.createElement('button');
            delLast.className = 'btn btn-sm btn-ghost text-danger';
            delLast.textContent = '− Última';
            delLast.onclick = async () => {
                if (g.sets.length <= 1) return;
                const last = g.sets[g.sets.length - 1];
                await deleteSet(last.id);
                sessionSets = sessionSets.filter(s2 => s2.id !== last.id);
                render();
            };
            actions.appendChild(delLast);
            block.appendChild(actions);

            s.appendChild(block);
        });

        // Add exercise button
        const addExBtn = document.createElement('button');
        addExBtn.className = 'btn btn-secondary btn-block mt-lg';
        addExBtn.textContent = '+ Agregar Ejercicio';
        addExBtn.onclick = () => showExercisePicker();
        s.appendChild(addExBtn);

        // Finish button
        const finishBtn = document.createElement('button');
        finishBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        finishBtn.textContent = '🏁 Terminar Entrenamiento';
        finishBtn.onclick = () => showFinishModal();
        s.appendChild(finishBtn);

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-danger btn-block mt-md';
        cancelBtn.textContent = '🗑 Cancelar Entrenamiento';
        cancelBtn.onclick = async () => {
            if (confirm('¿Eliminar esta sesión por completo?')) {
                if (sessionTimerInterval) clearInterval(sessionTimerInterval);
                await deleteSession(sessionData.id);
                localStorage.removeItem('activeSession');
                localStorage.removeItem('routineExercises');
                showToast('Sesión eliminada');
                navigate('/');
            }
        };
        s.appendChild(cancelBtn);
    }

    function showExercisePicker() {
        const content = document.createElement('div');
        let filterCat = null;

        function renderList() {
            content.innerHTML = '';
            const chips = document.createElement('div');
            chips.className = 'chip-group mb-md';
            const allChip = document.createElement('button');
            allChip.className = 'chip' + (!filterCat ? ' active' : '');
            allChip.textContent = 'Todos';
            allChip.onclick = () => { filterCat = null; renderList(); };
            chips.appendChild(allChip);
            CATEGORIES.forEach(c => {
                const ch = document.createElement('button');
                ch.className = 'chip' + (filterCat === c.value ? ' active' : '');
                ch.textContent = c.label;
                ch.onclick = () => { filterCat = c.value; renderList(); };
                chips.appendChild(ch);
            });
            content.appendChild(chips);

            const search = document.createElement('input');
            search.className = 'input mb-md';
            search.placeholder = '🔍 Buscar ejercicio...';
            search.oninput = () => {
                const q = search.value.toLowerCase();
                content.querySelectorAll('.ex-item').forEach(it => {
                    it.style.display = it.dataset.name.includes(q) ? '' : 'none';
                });
            };
            content.appendChild(search);

            const filtered = allExercises.filter(e => !filterCat || e.categoria === filterCat);
            filtered.forEach(ex => {
                const item = document.createElement('div');
                item.className = 'list-item ex-item';
                item.dataset.name = ex.nombre.toLowerCase();
                item.innerHTML = `
                  ${ex.url_imagen ? `<img src="${ex.url_imagen}" style="width:40px;height:40px;border-radius:var(--r-sm);object-fit:cover;flex-shrink:0" alt="">` : ''}
                  <div class="list-item-body"><div class="list-item-title">${ex.nombre}</div><div class="list-item-sub">${ex.categoria}${ex.es_resistencia ? ' • ⏱ resistencia' : ''}</div></div>`;
                item.onclick = async () => {
                    const lastW = await getLastWeight(ex.id);
                    const numSets = ex.series_sugeridas || 3;
                    for (let i = 1; i <= numSets; i++) {
                        const newSet = await addSet({
                            session_id: sessionData.id, exercise_id: ex.id,
                            exercise_name: ex.nombre, numero_serie: i,
                            peso_kg: lastW || 0,
                            repeticiones: ex.es_resistencia ? null : (ex.reps_sugeridas || 10),
                            duracion_seg: ex.es_resistencia ? (ex.tiempo_sugerido_seg || 0) : null,
                            completada: false
                        });
                        sessionSets.push(newSet);
                    }
                    document.querySelector('.modal-overlay')?.remove();
                    render();
                };
                content.appendChild(item);
            });
        }
        renderList();
        showModal({ title: 'Agregar Ejercicio', content });
    }

    function showFinishModal() {
        const content = document.createElement('div');
        let rpe = 5, dolor = 0, notas = '';

        content.appendChild(createSlider({ label: 'RPE (Esfuerzo)', id: 'fin-rpe', min: 1, max: 10, value: 5, onChange: v => rpe = v }));
        content.appendChild(createSlider({ label: 'Dolor de espalda', id: 'fin-dolor', min: 0, max: 10, value: 0, onChange: v => dolor = v }));

        const notaGrp = document.createElement('div');
        notaGrp.className = 'input-group';
        notaGrp.innerHTML = `<label class="input-label">Notas</label><textarea class="input" id="fin-notas" placeholder="¿Cómo fue la sesión?"></textarea>`;
        content.appendChild(notaGrp);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        saveBtn.textContent = '💾 Guardar y Terminar';
        saveBtn.onclick = async () => {
            if (sessionTimerInterval) clearInterval(sessionTimerInterval);
            notas = content.querySelector('#fin-notas').value;
            const now = new Date();
            const horaFin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            let duracion = null;
            if (sessionData.hora_inicio) {
                const [h1, m1] = sessionData.hora_inicio.split(':').map(Number);
                const [h2, m2] = horaFin.split(':').map(Number);
                duracion = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (duracion < 0) duracion += 1440;
            }
            await updateSession(sessionData.id, {
                hora_fin: horaFin, duracion_min: duracion,
                rpe, dolor_espalda_durante: dolor, notas,
                completada: true
            });
            localStorage.removeItem('activeSession');
            localStorage.removeItem('routineExercises');
            document.querySelector('.modal-overlay')?.remove();
            showToast('✅ ¡Entrenamiento guardado!');
            navigate('/');
        };
        content.appendChild(saveBtn);
        showModal({ title: '🏁 Finalizar Entrenamiento', content });
    }

    function startRestTimer(seconds) {
        if (restInterval) clearInterval(restInterval);
        let remaining = seconds;
        const overlay = document.createElement('div');
        overlay.className = 'rest-overlay';
        overlay.innerHTML = `<div class="rest-card"><div class="rest-label">Descanso</div><div class="timer-display timer-lg" id="rest-time">${formatTimer(remaining)}</div><div class="flex gap-sm justify-between mt-lg"><button class="btn btn-ghost" id="rest-minus-10">−10s</button><button class="btn btn-ghost" id="skip-rest">Saltar ▶</button><button class="btn btn-ghost" id="rest-plus-10">+10s</button></div></div>`;
        document.body.appendChild(overlay);

        restInterval = setInterval(() => {
            remaining--;
            const el = document.getElementById('rest-time');
            if (el) el.textContent = formatTimer(remaining);
            if (remaining <= 0) {
                clearInterval(restInterval);
                restInterval = null;
                overlay.remove();
                try { navigator.vibrate?.(300); } catch (e) { }
            }
        }, 1000);

        overlay.querySelector('#skip-rest').onclick = () => {
            clearInterval(restInterval);
            restInterval = null;
            overlay.remove();
        };
        overlay.querySelector('#rest-minus-10').onclick = () => { remaining = Math.max(0, remaining - 10); };
        overlay.querySelector('#rest-plus-10').onclick = () => { remaining += 10; };
    }

    function startResistanceTimer(set, inputEl) {
        if (resistanceInterval) clearInterval(resistanceInterval);
        let elapsed = 0;
        const overlay = document.createElement('div');
        overlay.className = 'rest-overlay';
        overlay.innerHTML = `<div class="rest-card"><div class="rest-label">⏱ ${set.exercise_name || 'Ejercicio'}</div><div class="timer-display timer-lg" id="res-time">00:00</div><button class="btn btn-primary btn-lg" id="stop-res">⏹ Detener</button></div>`;
        document.body.appendChild(overlay);

        resistanceInterval = setInterval(() => {
            elapsed++;
            const el = document.getElementById('res-time');
            if (el) el.textContent = formatTimer(elapsed);
        }, 1000);

        overlay.querySelector('#stop-res').onclick = async () => {
            clearInterval(resistanceInterval);
            resistanceInterval = null;
            set.duracion_seg = elapsed;
            await updateSet(set.id, { duracion_seg: elapsed });
            inputEl.value = elapsed;
            overlay.remove();
        };
    }

    function showExInfo(ex) {
        if (!ex) return;
        const content = document.createElement('div');

        if (ex.url_imagen) {
            const img = document.createElement('img');
            img.src = ex.url_imagen;
            img.style.cssText = 'width:100%;border-radius:var(--r-md);margin-bottom:var(--sp-lg);max-height:200px;object-fit:cover;';
            content.appendChild(img);
        }
        if (ex.descripcion) {
            const dl = document.createElement('div'); dl.className = 'section-label'; dl.textContent = '📝 Descripción'; content.appendChild(dl);
            const dp = document.createElement('p'); dp.className = 'text-sm mb-md'; dp.style.cssText = 'color:var(--text-secondary);line-height:1.6'; dp.textContent = ex.descripcion; content.appendChild(dp);
        }
        if (ex.indicaciones_escoliosis) {
            const sl = document.createElement('div'); sl.className = 'section-label mt-md'; sl.textContent = '🏥 Indicaciones Escoliosis'; content.appendChild(sl);
            const sc = document.createElement('div'); sc.style.cssText = 'background:var(--accent-dim);border-radius:var(--r-md);padding:var(--sp-md);margin-top:var(--sp-sm)';
            sc.innerHTML = `<p class="text-sm" style="color:var(--accent)">${ex.indicaciones_escoliosis}</p>`; content.appendChild(sc);
        }
        if (ex.series_sugeridas) {
            const si = document.createElement('div'); si.className = 'text-sm mt-md'; si.style.cssText = 'color:var(--accent);font-weight:700';
            const rt = ex.es_resistencia && ex.tiempo_sugerido_seg ? `${ex.tiempo_sugerido_seg}s` : `${ex.reps_sugeridas || '?'} reps`;
            si.textContent = `📊 Sugerido: ${ex.series_sugeridas} × ${rt}`; content.appendChild(si);
        }
        if (ex.alternativas_ids && ex.alternativas_ids.length > 0) {
            const al = document.createElement('div'); al.className = 'section-label mt-lg'; al.textContent = '🔄 Alternativas'; content.appendChild(al);
            ex.alternativas_ids.forEach(altId => {
                const altEx = allExercises.find(e => e.id === altId);
                if (!altEx) return;
                const it = document.createElement('div'); it.className = 'list-item'; it.style.cursor = 'pointer';
                it.innerHTML = `<div class="list-item-body"><div class="list-item-title">${altEx.nombre}</div><div class="list-item-sub">${altEx.descripcion ? altEx.descripcion.slice(0, 80) + '...' : altEx.categoria}</div></div>`;
                it.onclick = () => { document.querySelector('.modal-overlay')?.remove(); showExInfo(altEx); };
                content.appendChild(it);
            });
        }
        showModal({ title: ex.nombre, content });
    }

    render();
    return s;
}
