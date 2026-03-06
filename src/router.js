// Simple hash-based SPA router
const routes = {};
let contentEl = null;

export function registerRoute(path, handler) { routes[path] = handler; }

export function navigate(path) {
    window.location.hash = path;
}

export function currentPath() {
    return window.location.hash.slice(1) || '/';
}

export function initRouter(container) {
    contentEl = container;
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

async function handleRoute() {
    const path = currentPath();
    const handler = routes[path];
    if (!handler || !contentEl) return;

    contentEl.innerHTML = '';
    try {
        const screen = await handler();
        if (screen instanceof HTMLElement) {
            contentEl.appendChild(screen);
        }
    } catch (e) {
        console.error('Route error:', e);
        contentEl.innerHTML = `<div class="screen"><p class="text-danger">Error: ${e.message}</p></div>`;
    }

    // Update nav active states
    document.querySelectorAll('.nav-item, .sidebar-item').forEach(item => {
        const href = item.dataset.route;
        if (href === path || (path.startsWith(href) && href !== '/')) {
            item.classList.add('active');
        } else if (href === '/' && path === '/') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Hide nav during active workout
    const hideNav = path === '/workout/active';
    document.body.classList.toggle('workout-active', hideNav);

    window.scrollTo(0, 0);
}
