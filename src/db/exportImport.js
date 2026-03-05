// Export / Import functionality
import { getDB } from './database.js';

const STORE_NAMES = [
    'dias', 'entrenamientos', 'ejercicios', 'series',
    'sueno', 'alimentacion', 'suplementos', 'tomasSuplemento',
    'mediciones', 'notas', 'config'
];

// ==================== JSON ====================
export async function exportToJSON() {
    const db = await getDB();
    const data = {};
    for (const name of STORE_NAMES) {
        data[name] = await db.getAll(name);
    }
    data._exportDate = new Date().toISOString();
    data._appVersion = '1.0.0';
    return data;
}

export async function importFromJSON(data) {
    const db = await getDB();
    for (const name of STORE_NAMES) {
        if (!data[name]) continue;
        const tx = db.transaction(name, 'readwrite');
        // Clear existing data for this store
        await tx.store.clear();
        for (const record of data[name]) {
            await tx.store.put(record);
        }
        await tx.done;
    }
}

// ==================== CSV ====================
function arrayToCSV(arr) {
    if (!arr.length) return '';
    const headers = Object.keys(arr[0]);
    const rows = arr.map(item =>
        headers.map(h => {
            const val = item[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            // Escape quotes and wrap in quotes if needed
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

export async function exportToCSV() {
    const db = await getDB();
    const files = {};

    for (const name of STORE_NAMES) {
        if (name === 'config') continue; // skip config for CSV
        const data = await db.getAll(name);
        if (data.length > 0) {
            files[`${name}.csv`] = arrayToCSV(data);
        }
    }

    return files;
}

// Download helpers
export function downloadJSON(data, filename = 'mi-progreso-backup.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
}

export function downloadCSVFiles(files) {
    for (const [filename, content] of Object.entries(files)) {
        const blob = new Blob([content], { type: 'text/csv' });
        downloadBlob(blob, filename);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                resolve(JSON.parse(reader.result));
            } catch (e) {
                reject(new Error('Archivo JSON inválido'));
            }
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsText(file);
    });
}
