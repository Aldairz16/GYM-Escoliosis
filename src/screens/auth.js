// Auth Screen
import { supabase } from '../db/supabaseClient.js';
import { showToast } from '../components/ui.js';

export function renderAuth(onSuccess) {
    const s = document.createElement('div');
    s.className = 'screen';
    Object.assign(s.style, { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', paddingBottom: '0' });
    let isLogin = true;

    function render() {
        s.innerHTML = `
      <div class="text-center mb-lg">
        <div style="font-size:3rem;margin-bottom:var(--sp-md)">🏋️</div>
        <h1 class="screen-title">Mi Progreso</h1>
        <p class="screen-subtitle">Seguimiento de entrenamiento</p>
      </div>
      <div class="card">
        <h3 class="section-title">${isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h3>
        <div class="input-group"><label class="input-label" for="email">Correo</label><input type="email" id="email" class="input" placeholder="tu@email.com" autocomplete="email"></div>
        <div class="input-group"><label class="input-label" for="pass">Contraseña</label><input type="password" id="pass" class="input" placeholder="${isLogin ? 'Tu contraseña' : 'Mínimo 6 caracteres'}" autocomplete="${isLogin ? 'current-password' : 'new-password'}"></div>
        <button class="btn btn-primary btn-block btn-lg" id="submit">${isLogin ? '🔓 Entrar' : '✨ Crear Cuenta'}</button>
        <div class="divider"></div>
        <p class="text-center text-sm text-secondary">${isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'} <button class="btn btn-ghost" id="toggle" style="display:inline;padding:0">${isLogin ? 'Registrarse' : 'Iniciar sesión'}</button></p>
      </div>`;
        s.querySelector('#toggle').onclick = () => { isLogin = !isLogin; render(); };
        s.querySelector('#submit').onclick = submit;
        s.querySelector('#pass').onkeydown = e => { if (e.key === 'Enter') submit(); };
    }

    async function submit() {
        const email = s.querySelector('#email').value.trim();
        const pass = s.querySelector('#pass').value;
        const btn = s.querySelector('#submit');
        if (!email || !pass) return showToast('❌ Completa todos los campos');
        if (!isLogin && pass.length < 6) return showToast('❌ Mínimo 6 caracteres');
        btn.disabled = true; btn.textContent = '⏳ Cargando...';
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password: pass });
                if (error) throw error;
                const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (e2) { showToast('📧 Confirma tu correo'); isLogin = true; render(); return; }
            }
            showToast('✅ ¡Bienvenido!');
            if (onSuccess) onSuccess();
        } catch (e) {
            let m = e.message;
            if (m.includes('Invalid login') || m.includes('invalid_credentials')) m = 'Correo o contraseña incorrectos';
            if (m.includes('already registered')) m = 'Correo ya registrado';
            showToast('❌ ' + m);
            btn.disabled = false; btn.textContent = isLogin ? '🔓 Entrar' : '✨ Crear Cuenta';
        }
    }
    render();
    return s;
}
