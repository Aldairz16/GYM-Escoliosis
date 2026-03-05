// Steps Tracking Screen
import { getDia, saveDia, todayISO } from '../db/operations.js';
import { createInputGroup, createProgressRing, showToast, formatDate } from '../components/ui.js';
import { getConfig } from '../db/operations.js';
import { navigate } from '../router.js';

export async function renderSteps() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    const today = todayISO();
    let dia = await getDia(today) || { fecha: today, pasos_totales: 0 };
    const metaPasos = await getConfig('meta_pasos', 8000);

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Pasos</span>
    </div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/'));

    // Progress ring
    const ringSection = document.createElement('div');
    ringSection.className = 'card text-center';
    ringSection.innerHTML = '<h3 class="section-title">Progreso de Hoy</h3>';
    const ring = createProgressRing({
        value: dia.pasos_totales || 0,
        max: metaPasos,
        label: (dia.pasos_totales || 0).toLocaleString(),
        sublabel: `de ${metaPasos.toLocaleString()}`
    });
    ringSection.appendChild(ring);

    const pct = Math.min(100, Math.round(((dia.pasos_totales || 0) / metaPasos) * 100));
    const pctP = document.createElement('p');
    pctP.className = 'text-sm text-secondary mt-md';
    pctP.textContent = `${pct}% de tu meta diaria`;
    ringSection.appendChild(pctP);
    screen.appendChild(ringSection);

    // Edit total steps
    const editCard = document.createElement('div');
    editCard.className = 'card';
    editCard.innerHTML = '<h3 class="section-title">Editar Pasos Totales</h3>';
    editCard.appendChild(createInputGroup({
        label: 'Pasos del día',
        type: 'number',
        id: 'steps-total',
        value: dia.pasos_totales || '',
        placeholder: '0',
        min: 0
    }));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block';
    saveBtn.textContent = '💾 Guardar Pasos';
    saveBtn.addEventListener('click', async () => {
        dia.pasos_totales = parseInt(screen.querySelector('#steps-total').value) || 0;
        await saveDia(dia);
        showToast('✅ Pasos guardados');
        navigate('/');
    });
    editCard.appendChild(saveBtn);
    screen.appendChild(editCard);

    // Walk blocks (optional)
    const blocksCard = document.createElement('div');
    blocksCard.className = 'card';
    blocksCard.innerHTML = `
    <h3 class="section-title">Bloques de Caminata (opcional)</h3>
    <p class="text-xs text-secondary mb-md">Registra caminatas individuales durante el día</p>
    <div id="walk-blocks"></div>
    <button class="btn btn-secondary btn-sm mt-md" id="add-walk-block">+ Agregar bloque</button>
  `;

    const blocks = dia.bloques_caminata || [];
    const blocksContainer = blocksCard.querySelector('#walk-blocks');

    function renderBlocks() {
        blocksContainer.innerHTML = '';
        blocks.forEach((block, idx) => {
            const row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = `
        <div class="card-icon teal">🚶</div>
        <div class="list-item-content">
          <div class="list-item-title">${block.hora} — ${block.minutos} min</div>
          <div class="list-item-sub">${block.pasos_estimados || '?'} pasos estimados</div>
        </div>
        <button class="btn-icon remove-block" data-idx="${idx}">✕</button>
      `;
            row.querySelector('.remove-block').addEventListener('click', () => {
                blocks.splice(idx, 1);
                renderBlocks();
            });
            blocksContainer.appendChild(row);
        });
    }
    renderBlocks();

    blocksCard.querySelector('#add-walk-block').addEventListener('click', () => {
        const blockForm = document.createElement('div');
        blockForm.className = 'card mt-sm';
        blockForm.innerHTML = `
      <div class="flex gap-sm">
        <div class="input-group" style="flex:1">
          <label class="input-label">Hora</label>
          <input type="time" class="input" id="block-hora" value="${new Date().toTimeString().slice(0, 5)}" />
        </div>
        <div class="input-group" style="flex:1">
          <label class="input-label">Minutos</label>
          <input type="number" class="input" id="block-min" value="15" min="1" />
        </div>
        <div class="input-group" style="flex:1">
          <label class="input-label">Pasos est.</label>
          <input type="number" class="input" id="block-pasos" placeholder="0" min="0" />
        </div>
      </div>
      <button class="btn btn-primary btn-sm btn-block mt-sm" id="save-block">Agregar</button>
    `;
        blocksContainer.appendChild(blockForm);
        blockForm.querySelector('#save-block').addEventListener('click', async () => {
            blocks.push({
                hora: blockForm.querySelector('#block-hora').value,
                minutos: parseInt(blockForm.querySelector('#block-min').value) || 0,
                pasos_estimados: parseInt(blockForm.querySelector('#block-pasos').value) || 0
            });
            dia.bloques_caminata = blocks;
            await saveDia(dia);
            renderBlocks();
            showToast('Bloque agregado');
        });
    });

    screen.appendChild(blocksCard);

    return screen;
}
