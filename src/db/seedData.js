// Seed data — default exercises catalog and supplements
import { getAllEjercicios, addEjercicio, getAllSupplementos, addSuplemento, getConfig, setConfig } from './operations.js';

const DEFAULT_EXERCISES = [
    // Pierna
    { nombre: 'Sentadilla Goblet', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Sentadilla Búlgara', categoria: 'pierna', lado: 'unilateral' },
    { nombre: 'Prensa de Pierna', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Extensión de Cuádriceps', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Curl de Pierna', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Hip Thrust', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Peso Muerto Rumano', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Zancadas', categoria: 'pierna', lado: 'unilateral' },
    { nombre: 'Elevación de Talones', categoria: 'pierna', lado: 'bilateral' },
    { nombre: 'Step Up', categoria: 'pierna', lado: 'unilateral' },

    // Espalda
    { nombre: 'Jalón al Pecho', categoria: 'espalda', lado: 'bilateral' },
    { nombre: 'Remo con Mancuerna', categoria: 'espalda', lado: 'unilateral' },
    { nombre: 'Remo en Máquina', categoria: 'espalda', lado: 'bilateral' },
    { nombre: 'Remo con Barra', categoria: 'espalda', lado: 'bilateral' },
    { nombre: 'Pull-up / Dominada', categoria: 'espalda', lado: 'bilateral' },
    { nombre: 'Face Pull', categoria: 'espalda', lado: 'bilateral' },

    // Pecho
    { nombre: 'Press de Banca', categoria: 'pecho', lado: 'bilateral' },
    { nombre: 'Press Inclinado Mancuerna', categoria: 'pecho', lado: 'bilateral' },
    { nombre: 'Aperturas con Mancuerna', categoria: 'pecho', lado: 'bilateral' },
    { nombre: 'Flexiones de Pecho', categoria: 'pecho', lado: 'bilateral' },
    { nombre: 'Press en Máquina', categoria: 'pecho', lado: 'bilateral' },

    // Hombro
    { nombre: 'Press Militar', categoria: 'hombro', lado: 'bilateral' },
    { nombre: 'Elevación Lateral', categoria: 'hombro', lado: 'bilateral' },
    { nombre: 'Elevación Frontal', categoria: 'hombro', lado: 'bilateral' },
    { nombre: 'Pájaro / Rear Delt Fly', categoria: 'hombro', lado: 'bilateral' },

    // Core
    { nombre: 'Plank Frontal', categoria: 'core', lado: 'bilateral' },
    { nombre: 'Plank Lateral', categoria: 'core', lado: 'unilateral' },
    { nombre: 'Dead Bug', categoria: 'core', lado: 'bilateral' },
    { nombre: 'Bird Dog', categoria: 'core', lado: 'unilateral' },
    { nombre: 'Crunch', categoria: 'core', lado: 'bilateral' },
    { nombre: 'Russian Twist', categoria: 'core', lado: 'bilateral' },
    { nombre: 'Pallof Press', categoria: 'core', lado: 'unilateral' },

    // Movilidad
    { nombre: 'Cat-Cow', categoria: 'movilidad', lado: 'bilateral' },
    { nombre: 'Estiramiento de Cadera', categoria: 'movilidad', lado: 'unilateral' },
    { nombre: 'Rotación Torácica', categoria: 'movilidad', lado: 'unilateral' },
    { nombre: 'World\'s Greatest Stretch', categoria: 'movilidad', lado: 'unilateral' },
    { nombre: 'Foam Rolling', categoria: 'movilidad', lado: 'bilateral' },
    { nombre: 'Estiramiento de Isquiotibiales', categoria: 'movilidad', lado: 'unilateral' },

    // Cardio
    { nombre: 'Caminata', categoria: 'cardio', lado: 'bilateral' },
    { nombre: 'Bicicleta Estática', categoria: 'cardio', lado: 'bilateral' },
    { nombre: 'Elíptica', categoria: 'cardio', lado: 'bilateral' },
];

const DEFAULT_SUPPLEMENTS = [
    { nombre: 'Fish Oil (Omega-3)', dosis: '1000 mg' },
    { nombre: 'Vitamina D3', dosis: '1000 IU' },
    { nombre: 'Complejo B + Mg + Zn', dosis: '1 tableta' },
    { nombre: 'Melatonina', dosis: '1 mg' },
];

export async function seedIfNeeded() {
    const seeded = await getConfig('seeded');
    if (seeded) return;

    // Seed exercises
    const existingExercises = await getAllEjercicios();
    if (existingExercises.length === 0) {
        for (const ex of DEFAULT_EXERCISES) {
            await addEjercicio(ex);
        }
    }

    // Seed supplements
    const existingSupps = await getAllSupplementos();
    if (existingSupps.length === 0) {
        for (const sup of DEFAULT_SUPPLEMENTS) {
            await addSuplemento(sup);
        }
    }

    // Set default config
    await setConfig('seeded', true);
    await setConfig('meta_pasos', 8000);
    await setConfig('meta_sesiones_semana', 3);
    await setConfig('usuario', {
        nombre: 'Aldair',
        fecha_nacimiento: '',
        sexo: 'M',
        altura_cm: 0,
        peso_inicial_kg: 0
    });
}
