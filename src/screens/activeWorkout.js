// Active Workout Screen — live tracking with timers
import { getExercises, addSet, addSetsBulk, updateSet, deleteSet, getSessionSets, updateSession, getLastWeight, getLastSet, getMaxWeight, deleteSession, getConfig } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, showModal, formatTimer, createSlider, CATEGORIES } from '../components/ui.js';

let maxWeights = {};

let restInterval = null;
let resistanceInterval = null;
let sessionTimerInterval = null;
let sessionElapsedOffset = 0; // seconds
let sessionPaused = false;

export async function renderActiveWorkout() {
    const s = document.createElement('div');
    s.className = 'screen';

    const sessionData = JSON.parse(localStorage.getItem('activeSession') || 'null');
    if (!sessionData) { navigate('/workout'); return s; }

    s.innerHTML = `<div class="empty"><div class="empty-icon text-accent" style="animation:spin 1s linear infinite">⏳</div><div class="empty-text">Preparando tu sesión...</div></div>`;

    const allExercises = await getExercises();
    let sessionSets = await getSessionSets(sessionData.id);
    const routineExs = JSON.parse(localStorage.getItem('routineExercises') || '[]');
    let restTime = await getConfig('rest_timer', 60);
    const soundUrl = await getConfig('rest_timer_sound_url', 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const weightUnit = await getConfig('unidad_peso', 'kg');
    let sessionStart = sessionData.hora_inicio || null;
    sessionElapsedOffset = sessionData.elapsed_offset || 0;
    sessionPaused = sessionData.paused || false;

    // Helper to add sets (handles unilateral)
    async function createSetsForExercise(ex, numSets, w = 0, reps = 10, dur = 0, tipoSerie = 'normal', supersetId = null) {
        if (!ex) return;
        const n = ex.nombre;
        if (ex.lado === 'unilateral') {
            for (let i = 1; i <= numSets; i++) {
                const s1 = await addSet({
                    session_id: sessionData.id, exercise_id: ex.id, exercise_name: `${n} (Izq)`, numero_serie: i,
                    peso_kg: w, repeticiones: ex.es_resistencia ? null : reps, duracion_seg: ex.es_resistencia ? dur : null, completada: false, tipo_serie: tipoSerie, superset_id: supersetId
                });
                sessionSets.push(s1);
                const s2 = await addSet({
                    session_id: sessionData.id, exercise_id: ex.id, exercise_name: `${n} (Der)`, numero_serie: i,
                    peso_kg: w, repeticiones: ex.es_resistencia ? null : reps, duracion_seg: ex.es_resistencia ? dur : null, completada: false, tipo_serie: tipoSerie, superset_id: supersetId
                });
                sessionSets.push(s2);
            }
        } else {
            for (let i = 1; i <= numSets; i++) {
                const s = await addSet({
                    session_id: sessionData.id, exercise_id: ex.id, exercise_name: n, numero_serie: i,
                    peso_kg: w, repeticiones: ex.es_resistencia ? null : reps, duracion_seg: ex.es_resistencia ? dur : null, completada: false, tipo_serie: tipoSerie, superset_id: supersetId
                });
                sessionSets.push(s);
            }
        }
    }

    // Group sets by exercise
    function groupSets() {
        const groups = {};
        sessionSets.forEach(set => {
            const key = set.exercise_id || set.exercise_name;
            if (!groups[key]) {
                const ex = allExercises.find(e => e.id === set.exercise_id);
                groups[key] = { exercise: ex, name: ex?.nombre || set.exercise_name?.replace(/ \((Izq|Der)\)$/, ''), sets: [], isResistance: ex?.es_resistencia || false, supersetId: set.superset_id };
            }
            groups[key].sets.push(set);
        });
        return Object.values(groups);
    }

    // Pre-load routine exercises as empty sets
    if (routineExs.length > 0 && sessionSets.length === 0) {
        let newSetsData = [];
        for (const re of routineExs) {
            const ex = re.exercises || allExercises.find(e => e.id === re.exercise_id);
            if (!ex) continue;
            const numSets = re.series_sugeridas || 3;
            const lastSet = await getLastSet(ex.id);
            const w = re.peso_objetivo_kg || (lastSet ? lastSet.peso_kg : 0);
            const reps = re.reps_sugeridas || (lastSet ? lastSet.repeticiones : 10);
            const dur = re.duracion_objetivo_seg || (lastSet ? lastSet.duracion_seg : 0);

            if (re.descanso_seg) {
                localStorage.setItem(`rest_${ex.id}`, re.descanso_seg);
            }

            // Build objects for bulk insert
            const n = ex.nombre;
            const isRes = ex.es_resistencia;
            if (ex.lado === 'unilateral') {
                for (let i = 1; i <= numSets; i++) {
                    newSetsData.push({
                        session_id: sessionData.id, exercise_id: ex.id, exercise_name: `${n} (Izq)`, numero_serie: i,
                        peso_kg: w, repeticiones: isRes ? null : reps, duracion_seg: isRes ? dur : null, completada: false, tipo_serie: 'normal', superset_id: re.superset_id
                    });
                    newSetsData.push({
                        session_id: sessionData.id, exercise_id: ex.id, exercise_name: `${n} (Der)`, numero_serie: i,
                        peso_kg: w, repeticiones: isRes ? null : reps, duracion_seg: isRes ? dur : null, completada: false, tipo_serie: 'normal', superset_id: re.superset_id
                    });
                }
            } else {
                for (let i = 1; i <= numSets; i++) {
                    newSetsData.push({
                        session_id: sessionData.id, exercise_id: ex.id, exercise_name: n, numero_serie: i,
                        peso_kg: w, repeticiones: isRes ? null : reps, duracion_seg: isRes ? dur : null, completada: false, tipo_serie: 'normal', superset_id: re.superset_id
                    });
                }
            }

            if (!ex.es_resistencia && maxWeights[ex.id] === undefined) {
                maxWeights[ex.id] = await getMaxWeight(ex.id);
            }
        }

        if (newSetsData.length > 0) {
            const insertedSets = await addSetsBulk(newSetsData);
            sessionSets.push(...insertedSets);
        }

        localStorage.removeItem('routineExercises');
    }

    // Load PRs for existing sets
    const initialGroups = groupSets();
    for (const g of initialGroups) {
        if (!g.isResistance && g.exercise && maxWeights[g.exercise.id] === undefined) {
            maxWeights[g.exercise.id] = await getMaxWeight(g.exercise.id);
        }
    }

    // Calculate elapsed seconds
    function getElapsed() {
        if (!sessionStart) return sessionElapsedOffset;
        if (sessionPaused) return sessionElapsedOffset;
        const [h, m] = sessionStart.split(':').map(Number);
        const now = new Date();
        const startMin = h * 60 + m;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const secs = (nowMin - startMin) * 60 + now.getSeconds();
        const realElapsed = secs < 0 ? secs + 86400 : secs;
        return realElapsed + sessionElapsedOffset;
    }

    async function saveSessionState() {
        sessionData.elapsed_offset = sessionElapsedOffset;
        sessionData.paused = sessionPaused;
        sessionData.hora_inicio = sessionStart;
        localStorage.setItem('activeSession', JSON.stringify(sessionData));
        await updateSession(sessionData.id, { hora_inicio: sessionStart });
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
          <button id="session-clock-btn" class="btn btn-ghost btn-sm" style="color:var(--accent);font-weight:700;font-variant-numeric:tabular-nums;padding:0;min-width:60px">
            ${sessionPaused ? '⏸ ' : ''}${formatTimer(getElapsed())}
          </button>
        `;
        s.appendChild(header);

        // Session timer update
        const clockBtn = header.querySelector('#session-clock-btn');
        sessionTimerInterval = setInterval(() => {
            if (clockBtn && !sessionPaused) clockBtn.innerHTML = `${sessionPaused ? '⏸ ' : ''}${formatTimer(getElapsed())}`;
        }, 1000);

        clockBtn.onclick = () => {
            const m = document.createElement('div');
            m.innerHTML = `
                <div class="mb-md text-center text-sm text-secondary">Control del Entrenamiento</div>
                <button class="btn ${sessionPaused ? 'btn-primary' : 'btn-secondary'} btn-block mb-sm" id="toggle-pause-btn">${sessionPaused ? '▶ Reanudar' : '⏸ Pausar'}</button>
                <div class="input-group mt-md">
                    <label class="input-label">Cambiar hora de inicio</label>
                    <input type="time" class="input" id="edit-start-time" value="${sessionStart || ''}">
                </div>
                <button class="btn btn-primary btn-block mt-md" id="save-time-btn">Guardar</button>
             `;
            m.querySelector('#toggle-pause-btn').onclick = () => {
                if (sessionPaused) {
                    sessionPaused = false;
                    // On resume, we reset start time to now so we calculate delta correctly, but offset has historical
                    const now = new Date();
                    sessionStart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                } else {
                    sessionPaused = true;
                    sessionElapsedOffset = getElapsed();
                }
                saveSessionState();
                document.querySelector('.modal-overlay')?.remove();
                render();
            };
            m.querySelector('#save-time-btn').onclick = () => {
                const newT = m.querySelector('#edit-start-time').value;
                if (newT) {
                    sessionStart = newT;
                    sessionElapsedOffset = 0; // reset offset if manually changing start
                    saveSessionState();
                }
                document.querySelector('.modal-overlay')?.remove();
                render();
            };
            showModal({ title: 'Cronómetro', content: m });
        };

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

        groups.forEach((g, idx) => {
            const block = document.createElement('div');
            block.className = 'exercise-block';

            // Superset link styling if linked to previous
            if (idx > 0 && g.supersetId && g.supersetId === groups[idx - 1].supersetId) {
                const linkIcon = document.createElement('div');
                linkIcon.style.cssText = 'position:absolute; top:-25px; left:20px; font-size:24px; color:var(--accent); z-index:1';
                linkIcon.textContent = '🔗';
                block.style.position = 'relative';
                block.style.marginTop = 'var(--sp-xs)';
                block.appendChild(linkIcon);
            }

            // Exercise header with info button
            const ehdr = document.createElement('div');
            ehdr.className = 'exercise-header';
            const prText = (!g.isResistance && maxWeights[g.exercise?.id]) ? `<span style="font-size:0.8rem;color:var(--accent);margin-left:8px">🏆 PR: ${maxWeights[g.exercise.id]} ${weightUnit}</span>` : '';
            ehdr.innerHTML = `<span class="exercise-name">${g.name}${prText}</span><div class="flex gap-sm items-center">${g.isResistance ? '<span class="exercise-badge">⏱ Resistencia</span>' : ''}<button class="btn btn-ghost btn-sm ex-info-btn" title="Info y alternativas">ℹ️</button></div>`;
            ehdr.querySelector('.ex-info-btn').onclick = () => showExInfo(g.exercise);

            const restBtn = document.createElement('button');
            restBtn.className = 'btn btn-ghost btn-sm';
            restBtn.style.fontSize = '0.75rem';
            const exRest = parseInt(localStorage.getItem(`rest_${g.exercise?.id}`)) || restTime;
            restBtn.innerHTML = `⏱ ${exRest}s`;
            restBtn.onclick = () => {
                let r = parseInt(prompt('Segundos de descanso para este ejercicio:', exRest));
                if (r > 0) {
                    localStorage.setItem(`rest_${g.exercise?.id}`, r);
                    render();
                }
            };
            ehdr.querySelector('.flex').insertBefore(restBtn, ehdr.querySelector('.ex-info-btn'));

            block.appendChild(ehdr);

            // Set headers
            const hdr = document.createElement('div');
            hdr.className = 'set-row header';
            hdr.style.gridTemplateColumns = '30px 1fr 1fr 1fr 40px 30px';
            hdr.innerHTML = `<div>Set</div><div>${g.isResistance ? 'Seg' : weightUnit}</div><div>${g.isResistance ? '' : 'Reps'}</div><div>Desc.</div><div>Tipo</div><div>✓</div>`;
            block.appendChild(hdr);

            // Sets
            g.sets.forEach(set => {
                const row = document.createElement('div');
                row.className = 'set-row';
                row.style.gridTemplateColumns = '30px 1fr 1fr 1fr 40px 30px';
                row.innerHTML = `<div class="set-num">${set.numero_serie}</div>`;

                // Weight / Duration input
                const inp1 = document.createElement('input');
                inp1.className = 'set-input';
                inp1.type = g.isResistance ? 'number' : 'text';
                inp1.inputMode = 'decimal';
                if (g.isResistance) inp1.step = '1';
                inp1.value = g.isResistance ? (set.duracion_seg || '') : (set.peso_kg || '');
                inp1.placeholder = g.isResistance ? 'seg' : weightUnit;
                inp1.onchange = () => {
                    let val = 0;
                    if (g.isResistance) {
                        val = parseInt(inp1.value) || 0;
                        updateSet(set.id, { duracion_seg: val });
                        set.duracion_seg = val;
                    } else {
                        val = parseFloat(inp1.value.replace(',', '.')) || 0;
                        // Format back to dot
                        inp1.value = val !== 0 ? val : '';
                        updateSet(set.id, { peso_kg: val });
                        set.peso_kg = val;
                    }
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

                // Descanso input
                const inpDesc = document.createElement('input');
                inpDesc.className = 'set-input';
                inpDesc.type = 'number';
                inpDesc.inputMode = 'numeric';
                inpDesc.value = set.descanso_prev_seg || '';
                inpDesc.placeholder = 'seg';
                inpDesc.onchange = () => {
                    set.descanso_prev_seg = parseInt(inpDesc.value) || null;
                    updateSet(set.id, { descanso_prev_seg: set.descanso_prev_seg });
                };
                row.appendChild(inpDesc);

                // Type selector
                const typeSel = document.createElement('select');
                typeSel.className = 'set-type-sel';
                typeSel.style.cssText = 'background:transparent;border:none;color:var(--text);font-size:0.8rem;text-align:center;-webkit-appearance:none;appearance:none;cursor:pointer;opacity:0.8';
                const tOpts = { 'normal': 'N', 'calentamiento': 'W', 'dropset': 'D', 'fallo': 'F' };
                typeSel.innerHTML = Object.entries(tOpts).map(([k, v]) => `<option value="${k}" ${set.tipo_serie === k ? 'selected' : ''}>${v}</option>`).join('');
                typeSel.onchange = () => {
                    set.tipo_serie = typeSel.value;
                    updateSet(set.id, { tipo_serie: set.tipo_serie });
                };
                row.appendChild(typeSel);

                // Check button
                const check = document.createElement('button');
                check.className = 'set-check' + (set.completada ? ' done' : '');
                check.textContent = set.completada ? '✓' : '○';
                check.onclick = async () => {
                    set.completada = !set.completada;
                    await updateSet(set.id, { completada: set.completada });
                    check.className = 'set-check' + (set.completada ? ' done' : '');
                    check.textContent = set.completada ? '✓' : '○';

                    if (set.completada) {
                        // Propagate values to next uncompleted set of same exercise
                        const nextSet = g.sets.find(s => !s.completada && s.numero_serie >= set.numero_serie && s.id !== set.id);
                        if (nextSet) {
                            nextSet.peso_kg = set.peso_kg;
                            nextSet.repeticiones = set.repeticiones;
                            nextSet.duracion_seg = set.duracion_seg;
                            nextSet.tipo_serie = set.tipo_serie;
                            await updateSet(nextSet.id, { peso_kg: set.peso_kg, repeticiones: set.repeticiones, duracion_seg: set.duracion_seg, tipo_serie: set.tipo_serie });
                            render();
                        }

                        const exRest = parseInt(localStorage.getItem(`rest_${g.exercise?.id}`)) || restTime;
                        startRestTimer(exRest);
                    }
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
                let isLeft = lastSet.exercise_name?.endsWith('(Izq)');
                let isRight = lastSet.exercise_name?.endsWith('(Der)');

                // If it's a unilateral exercise that already has L/R, add both
                if ((isLeft || isRight) && g.exercise?.lado === 'unilateral') {
                    const newNum = lastSet.numero_serie + 1;
                    const baseName = g.exercise.nombre;
                    const s1 = await addSet({
                        session_id: sessionData.id, exercise_id: lastSet.exercise_id,
                        exercise_name: `${baseName} (Izq)`, numero_serie: newNum,
                        peso_kg: lastSet.peso_kg || 0, repeticiones: g.isResistance ? null : (lastSet.repeticiones || 0), duracion_seg: g.isResistance ? (lastSet.duracion_seg || 0) : null, completada: false, tipo_serie: 'normal'
                    });
                    sessionSets.push(s1);
                    const s2 = await addSet({
                        session_id: sessionData.id, exercise_id: lastSet.exercise_id,
                        exercise_name: `${baseName} (Der)`, numero_serie: newNum,
                        peso_kg: lastSet.peso_kg || 0, repeticiones: g.isResistance ? null : (lastSet.repeticiones || 0), duracion_seg: g.isResistance ? (lastSet.duracion_seg || 0) : null, completada: false, tipo_serie: 'normal'
                    });
                    sessionSets.push(s2);
                } else {
                    const newSet = await addSet({
                        session_id: sessionData.id, exercise_id: lastSet.exercise_id,
                        exercise_name: lastSet.exercise_name, numero_serie: lastSet.numero_serie + (isLeft || isRight ? 0 : 1),
                        peso_kg: lastSet.peso_kg || 0, repeticiones: g.isResistance ? null : (lastSet.repeticiones || 0),
                        duracion_seg: g.isResistance ? (lastSet.duracion_seg || 0) : null, completada: false, tipo_serie: 'normal'
                    });
                    sessionSets.push(newSet);
                }
                render();
            };
            actions.appendChild(addBtn);

            const delLast = document.createElement('button');
            delLast.className = 'btn btn-sm btn-ghost text-danger';
            delLast.textContent = '− Última';
            delLast.onclick = async () => {
                if (g.sets.length <= 1) return;

                const last = g.sets[g.sets.length - 1];
                let toDelete = [last];

                // If unilateral, delete both L and R of the last series
                if (g.exercise?.lado === 'unilateral') {
                    const partner = g.sets.find(s => s.numero_serie === last.numero_serie && s.id !== last.id);
                    if (partner) toDelete.push(partner);
                }

                for (let s of toDelete) {
                    await deleteSet(s.id);
                    sessionSets = sessionSets.filter(s2 => s2.id !== s.id);
                }
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
                    const lastSet = await getLastSet(ex.id);
                    const numSets = ex.series_sugeridas || 3;
                    const w = lastSet?.peso_kg || 0;
                    const reps = lastSet?.repeticiones || ex.reps_sugeridas || 10;
                    const dur = lastSet?.duracion_seg || ex.tiempo_sugerido_seg || 0;

                    await createSetsForExercise(ex, numSets, w, reps, dur);

                    if (!ex.es_resistencia && maxWeights[ex.id] === undefined) {
                        maxWeights[ex.id] = await getMaxWeight(ex.id);
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

        if (sessionData.rutina_id) {
            const updGrp = document.createElement('div');
            updGrp.className = 'mt-md';
            updGrp.innerHTML = `<label style="display:flex;align-items:center;gap:10px;font-size:0.9rem;cursor:pointer"><input type="checkbox" id="fin-update-routine" checked> Actualizar plantilla original con los cambios de hoy</label>`;
            content.appendChild(updGrp);
        }

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        saveBtn.textContent = '💾 Guardar y Terminar';
        saveBtn.onclick = async () => {
            if (sessionTimerInterval) clearInterval(sessionTimerInterval);
            notas = content.querySelector('#fin-notas').value;
            const updateRoutine = content.querySelector('#fin-update-routine')?.checked;

            const now = new Date();
            const horaFin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            let duracion = null;
            if (sessionStart) {
                // Best effort via getElapsed since there might be pauses
                duracion = Math.round(getElapsed() / 60);
            }
            await updateSession(sessionData.id, {
                hora_fin: horaFin, duracion_min: duracion,
                rpe, dolor_espalda_durante: dolor, notas,
                completada: true
            });

            // Eliminar series incompletas de la BD para que no ensucien el historial
            const uncompleted = sessionSets.filter(s => !s.completada);
            for (const s of uncompleted) {
                try { await deleteSet(s.id); } catch (e) { }
            }

            if (updateRoutine && sessionData.rutina_id) {
                // Determine exercise list from actual sessionSets
                // We just keep the first instance of each exercise to preserve order
                const existingExs = [];
                const finalRoutineRows = [];
                sessionSets.forEach(s => {
                    const exId = s.exercise_id;
                    if (!existingExs.includes(exId)) {
                        existingExs.push(exId);
                        // find its sets
                        const exSets = sessionSets.filter(os => os.exercise_id === exId);
                        const weight = Math.max(...exSets.map(x => x.peso_kg || 0));
                        const targetReps = Math.max(...exSets.map(x => x.repeticiones || 0));
                        finalRoutineRows.push({
                            routine_id: sessionData.rutina_id,
                            exercise_id: exId,
                            orden: existingExs.length - 1,
                            series_sugeridas: exSets.length, // L/R might double count, simplistic for now
                            reps_sugeridas: targetReps,
                            peso_objetivo_kg: weight,
                            duracion_objetivo_seg: exSets[0].duracion_seg || null
                        });
                    }
                });
                // Delete existing routine exercises and insert new ones
                const { supabase } = await import('../db/supabaseClient.js');
                await supabase.from('routine_exercises').delete().eq('routine_id', sessionData.rutina_id);
                if (finalRoutineRows.length > 0) {
                    await supabase.from('routine_exercises').insert(finalRoutineRows);
                }
            }

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
                try {
                    navigator.vibrate?.([300, 100, 300]);
                    const audio = new Audio(soundUrl);
                    audio.play().catch(e => console.log('Audio error:', e));
                } catch (e) { }
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
                const it = document.createElement('div'); it.className = 'list-item flex flex-col items-start gap-xs'; it.style.cursor = 'pointer';
                const mainRow = document.createElement('div');
                mainRow.className = 'flex justify-between w-full items-center';
                mainRow.innerHTML = `<div class="list-item-body"><div class="list-item-title">${altEx.nombre}</div><div class="list-item-sub">${altEx.descripcion ? altEx.descripcion.slice(0, 80) + '...' : altEx.categoria}</div></div>`;

                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-secondary mt-sm w-full';
                btn.textContent = 'Reemplazar en sesión';
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const setsToReplace = sessionSets.filter(s => s.exercise_id === ex.id && !s.completada);
                    if (setsToReplace.length === 0) {
                        showToast('No hay series incompletas para reemplazar de ' + ex.nombre);
                        return;
                    }
                    if (!confirm(`¿Reemplazar ${setsToReplace.length} series incompletas por ${altEx.nombre}?`)) return;

                    for (const s of setsToReplace) {
                        s.exercise_id = altEx.id;
                        s.exercise_name = s.exercise_name?.includes('(Izq)') ? `${altEx.nombre} (Izq)` : s.exercise_name?.includes('(Der)') ? `${altEx.nombre} (Der)` : altEx.nombre;
                        await updateSet(s.id, { exercise_id: altEx.id, exercise_name: s.exercise_name });
                    }
                    if (!altEx.es_resistencia && maxWeights[altEx.id] === undefined) {
                        maxWeights[altEx.id] = await getMaxWeight(altEx.id);
                    }
                    document.querySelector('.modal-overlay')?.remove();
                    showToast('✅ Ejercicio reemplazado');
                    render();
                };

                mainRow.onclick = () => { document.querySelector('.modal-overlay')?.remove(); showExInfo(altEx); };
                it.appendChild(mainRow);
                it.appendChild(btn);
                content.appendChild(it);
            });
        }
        showModal({ title: ex.nombre, content });
    }

    render();
    return s;
}
