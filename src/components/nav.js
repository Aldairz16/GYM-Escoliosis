// Navigation components
import { navigate, currentPath } from '../router.js';

const NAV_ITEMS = [
    { icon: '🏠', label: 'Inicio', route: '/' },
    { icon: '💪', label: 'Entrenar', route: '/workout' },
    { icon: '📅', label: 'Historial', route: '/history' },
    { icon: '📋', label: 'Rutinas', route: '/routines' },
    { icon: '⚙️', label: 'Más', route: '/settings' },
];

export function renderBottomNav() {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    NAV_ITEMS.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'nav-item' + (currentPath() === item.route ? ' active' : '');
        btn.dataset.route = item.route;
        btn.innerHTML = `<span class="nav-icon">${item.icon}</span>${item.label}`;
        btn.addEventListener('click', () => navigate(item.route));
        nav.appendChild(btn);
    });
    return nav;
}

export function renderSidebar() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `<div class="sidebar-brand">💪 Mi Progreso</div>`;
    const nav = document.createElement('div');
    nav.className = 'sidebar-nav';

    const allItems = [
        ...NAV_ITEMS,
        { icon: '🏃', label: 'Ejercicios', route: '/exercises' },
        { icon: '📝', label: 'Diario', route: '/daily' },
        { icon: '📏', label: 'Medidas', route: '/measurements' },
    ];

    allItems.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-item' + (currentPath() === item.route ? ' active' : '');
        btn.dataset.route = item.route;
        btn.innerHTML = `<span class="icon">${item.icon}</span>${item.label}`;
        btn.addEventListener('click', () => navigate(item.route));
        nav.appendChild(btn);
    });

    sidebar.appendChild(nav);
    sidebar.innerHTML += `<div class="sidebar-footer">Mi Progreso v2.0</div>`;
    return sidebar;
}
