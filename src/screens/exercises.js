// Exercises Screen
import { getExercises, createExercise } from '../db/supabase.js';
import { showToast, showModal, CATEGORIES, createInput, createChips } from '../components/ui.js';

export async function renderExercises() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `<h1 class="screen-title">Ejercicios</h1><p class="screen-subtitle">Catálogo de ejercicios</p>`;

    let filterCat = null;
    let searchQuery = '';

    const filterEl = document.createElement('div');
    s.appendChild(filterEl);

    const search = document.createElement('input');
    search.className = 'input mb-md';
    search.placeholder = '🔍 Buscar...';
    search.oninput = () => { searchQuery = search.value.toLowerCase(); renderList(); };
    s.appendChild(search);

    const listEl = document.createElement('div');
    s.appendChild(listEl);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-block mt-lg';
    addBtn.textContent = '+ Crear Ejercicio';
    addBtn.onclick = () => showCreateModal();
    s.appendChild(addBtn);

    let exercises = await getExercises();

    function renderFilters() {
        filterEl.innerHTML = '';
        const chips = document.createElement('div');
        chips.className = 'chip-group';
        const allChip = document.createElement('button');
        allChip.className = 'chip' + (!filterCat ? ' active' : '');
        allChip.textContent = 'Todos';
        allChip.onclick = () => { filterCat = null; renderFilters(); renderList(); };
        chips.appendChild(allChip);
        CATEGORIES.forEach(c => {
            const ch = document.createElement('button');
            ch.className = 'chip' + (filterCat === c.value ? ' active' : '');
            ch.textContent = c.label;
            ch.onclick = () => { filterCat = c.value; renderFilters(); renderList(); };
            chips.appendChild(ch);
        });
        filterEl.appendChild(chips);
    }

    function renderList() {
        listEl.innerHTML = '';
        const filtered = exercises.filter(e => {
            if (filterCat && e.categoria !== filterCat) return false;
            if (searchQuery && !e.nombre.toLowerCase().includes(searchQuery)) return false;
            return true;
        });
        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty"><div class="empty-text">No hay ejercicios</div></div>`;
            return;
        }
        filtered.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
        <div class="list-icon">${CATEGORIES.find(c => c.value === ex.categoria)?.label.split(' ')[0] || '📋'}</div>
        <div class="list-item-body">
          <div class="list-item-title">${ex.nombre}</div>
          <div class="list-item-sub">${ex.categoria} ${ex.es_resistencia ? '• ⏱ resistencia' : ''} • ${ex.lado}${ex.user_id ? ' • ⭐ personal' : ''}</div>
        </div>
      `;
            listEl.appendChild(item);
        });
    }

    function showCreateModal() {
        const content = document.createElement('div');
        let cat = 'pierna', resist = false, lado = 'bilateral';

        content.appendChild(createInput({ label: 'Nombre del ejercicio', id: 'ex-name', placeholder: 'Ej: Sentadilla con barra' }));

        const catLabel = document.createElement('div'); catLabel.className = 'section-label'; catLabel.textContent = 'Categoría';
        content.appendChild(catLabel);
        content.appendChild(createChips({ options: CATEGORIES, selected: cat, onChange: v => cat = v }));

        const resistRow = document.createElement('div');
        resistRow.className = 'toggle-row';
        resistRow.innerHTML = `<span class="input-label">¿Ejercicio de resistencia? (medir en segundos)</span><label class="toggle"><input type="checkbox" id="ex-resist"><span class="toggle-track"></span></label>`;
        resistRow.querySelector('#ex-resist').onchange = e => resist = e.target.checked;
        content.appendChild(resistRow);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        saveBtn.textContent = '💾 Crear';
        saveBtn.onclick = async () => {
            const nombre = content.querySelector('#ex-name').value.trim();
            if (!nombre) return showToast('❌ Nombre requerido');
            try {
                await createExercise({ nombre, categoria: cat, es_resistencia: resist, lado });
                exercises = await getExercises();
                document.querySelector('.modal-overlay')?.remove();
                showToast('✅ Ejercicio creado');
                renderList();
            } catch (e) { showToast('❌ ' + e.message); }
        };
        content.appendChild(saveBtn);
        showModal({ title: 'Nuevo Ejercicio', content });
    }

    renderFilters();
    renderList();
    return s;
}
