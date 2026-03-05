// Supplements Tracking Screen
import { getAllSupplementos, addSuplemento, deleteSuplemento, addTomaSuplemento, getTomasByFecha, deleteTomaSuplemento } from '../db/operations.js';
import { showToast, todayISO, nowTime, formatDateShort, createInputGroup, createModal } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderSupplements() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Suplementos</span>
    </div>
    <div id="supp-content"></div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/'));
    await renderSuppContent(screen.querySelector('#supp-content'));
    return screen;
}

async function renderSuppContent(container) {
    container.innerHTML = '';
    const suplementos = await getAllSupplementos();
    const tomasHoy = await getTomasByFecha(todayISO());
    const tomasSuppIds = tomasHoy.map(t => t.id_suplemento);

    // Today's header
    const todayLabel = document.createElement('p');
    todayLabel.className = 'section-label';
    todayLabel.textContent = 'Tomas de hoy';
    container.appendChild(todayLabel);

    // Supplement list
    for (const sup of suplementos) {
        const taken = tomasSuppIds.includes(sup.id);
        const tomasCount = tomasHoy.filter(t => t.id_suplemento === sup.id).length;

        const item = document.createElement('div');
        item.className = 'supplement-item';
        item.innerHTML = `
      <div class="supplement-info">
        <div class="supplement-name">${sup.nombre}</div>
        <div class="supplement-dose">${sup.dosis}${tomasCount > 0 ? ` · ${tomasCount} toma${tomasCount > 1 ? 's' : ''} hoy` : ''}</div>
      </div>
      <button class="supplement-check ${taken ? 'taken' : ''}" data-id="${sup.id}">
        ${taken ? '✓' : '○'}
      </button>
    `;

        const checkBtn = item.querySelector('.supplement-check');
        checkBtn.addEventListener('click', async () => {
            await addTomaSuplemento({
                fecha: todayISO(),
                id_suplemento: sup.id,
                nombre_suplemento: sup.nombre,
                hora: nowTime(),
                con_comida: 'sin_comida'
            });
            showToast(`✅ ${sup.nombre} registrado`);
            await renderSuppContent(container);
        });

        container.appendChild(item);
    }

    // Add new supplement button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-block mt-lg';
    addBtn.textContent = '+ Agregar suplemento';
    addBtn.addEventListener('click', () => {
        const content = document.createElement('div');
        content.appendChild(createInputGroup({ label: 'Nombre', type: 'text', id: 'new-sup-name', placeholder: 'Ej: Creatina' }));
        content.appendChild(createInputGroup({ label: 'Dosis', type: 'text', id: 'new-sup-dose', placeholder: 'Ej: 5 g' }));

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-block mt-md';
        saveBtn.textContent = 'Guardar';
        saveBtn.addEventListener('click', async () => {
            const name = content.querySelector('#new-sup-name').value.trim();
            const dose = content.querySelector('#new-sup-dose').value.trim();
            if (!name) return;
            await addSuplemento({ nombre: name, dosis: dose || 'N/A' });
            showToast('✅ Suplemento agregado');
            document.querySelector('.modal-overlay')?.remove();
            await renderSuppContent(container);
        });
        content.appendChild(saveBtn);

        createModal({ title: 'Nuevo Suplemento', content });
    });
    container.appendChild(addBtn);

    // Today's log
    if (tomasHoy.length > 0) {
        const logLabel = document.createElement('p');
        logLabel.className = 'section-label mt-xl';
        logLabel.textContent = 'Registro de hoy';
        container.appendChild(logLabel);

        for (const toma of tomasHoy) {
            const logItem = document.createElement('div');
            logItem.className = 'list-item';
            logItem.innerHTML = `
        <div class="card-icon teal">💊</div>
        <div class="list-item-content">
          <div class="list-item-title">${toma.nombre_suplemento}</div>
          <div class="list-item-sub">${toma.hora}</div>
        </div>
        <button class="btn btn-ghost btn-sm del-toma" style="color: var(--accent-danger)">✕</button>
      `;
            logItem.querySelector('.del-toma').addEventListener('click', async () => {
                await deleteTomaSuplemento(toma.id);
                showToast('Toma eliminada');
                await renderSuppContent(container);
            });
            container.appendChild(logItem);
        }
    }
}
