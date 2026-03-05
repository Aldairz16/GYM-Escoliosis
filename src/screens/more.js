// "More" hub screen
import { navigate } from '../router.js';

export function renderMore() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <h1 class="screen-title">Más</h1>
    <p class="screen-subtitle">Herramientas y configuración</p>
    <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
      <div class="list-item" data-route="/registro/mediciones">
        <div class="card-icon teal">📏</div>
        <div class="list-item-content">
          <div class="list-item-title">Mediciones</div>
          <div class="list-item-sub">Peso, cintura, cadera y gráficas</div>
        </div>
        <span class="text-muted">→</span>
      </div>
      <div class="list-item" data-route="/registro/notas">
        <div class="card-icon purple">📋</div>
        <div class="list-item-content">
          <div class="list-item-title">Notas Clínicas</div>
          <div class="list-item-sub">Diario de salud y dolor</div>
        </div>
        <span class="text-muted">→</span>
      </div>
      <div class="list-item" data-route="/mas/configuracion">
        <div class="card-icon blue">⚙️</div>
        <div class="list-item-content">
          <div class="list-item-title">Configuración</div>
          <div class="list-item-sub">Perfil, metas, exportar/importar datos</div>
        </div>
        <span class="text-muted">→</span>
      </div>
    </div>
  `;

    screen.querySelectorAll('.list-item[data-route]').forEach(item => {
        item.addEventListener('click', () => navigate(item.dataset.route));
    });

    return screen;
}
