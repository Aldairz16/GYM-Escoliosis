// Simple hash-based SPA router
const routes = {};
let currentRoute = null;
let contentEl = null;

export function registerRoute(path, renderFn) {
    routes[path] = renderFn;
}

export function navigate(path) {
    window.location.hash = path;
}

export function getCurrentRoute() {
    return currentRoute;
}

export function initRouter(containerEl) {
    contentEl = containerEl;

    const handleRoute = async () => {
        const hash = window.location.hash.slice(1) || '/';
        currentRoute = hash;
        const renderFn = routes[hash];
        if (renderFn) {
            contentEl.innerHTML = '';
            const screen = await renderFn();
            if (typeof screen === 'string') {
                contentEl.innerHTML = screen;
            } else if (screen instanceof HTMLElement) {
                contentEl.appendChild(screen);
            }
            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(item => {
                const route = item.dataset.route;
                item.classList.toggle('active', hash.startsWith(route));
            });
        }
    };

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
