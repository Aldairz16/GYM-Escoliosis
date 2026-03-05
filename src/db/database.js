// Database module — IndexedDB with idb wrapper
import { openDB } from 'idb';

const DB_NAME = 'mi-progreso-db';
const DB_VERSION = 1;

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Días
      if (!db.objectStoreNames.contains('dias')) {
        db.createObjectStore('dias', { keyPath: 'fecha' });
      }

      // Entrenamientos
      if (!db.objectStoreNames.contains('entrenamientos')) {
        const store = db.createObjectStore('entrenamientos', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha');
      }

      // Ejercicios (catálogo)
      if (!db.objectStoreNames.contains('ejercicios')) {
        const store = db.createObjectStore('ejercicios', { keyPath: 'id', autoIncrement: true });
        store.createIndex('nombre', 'nombre');
        store.createIndex('categoria', 'categoria');
      }

      // Series
      if (!db.objectStoreNames.contains('series')) {
        const store = db.createObjectStore('series', { keyPath: 'id', autoIncrement: true });
        store.createIndex('id_entrenamiento', 'id_entrenamiento');
      }

      // Sueño
      if (!db.objectStoreNames.contains('sueno')) {
        db.createObjectStore('sueno', { keyPath: 'fecha_noche' });
      }

      // Alimentación
      if (!db.objectStoreNames.contains('alimentacion')) {
        const store = db.createObjectStore('alimentacion', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha');
      }

      // Suplementos (catálogo)
      if (!db.objectStoreNames.contains('suplementos')) {
        db.createObjectStore('suplementos', { keyPath: 'id', autoIncrement: true });
      }

      // Tomas de suplemento
      if (!db.objectStoreNames.contains('tomasSuplemento')) {
        const store = db.createObjectStore('tomasSuplemento', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha');
        store.createIndex('id_suplemento', 'id_suplemento');
      }

      // Mediciones
      if (!db.objectStoreNames.contains('mediciones')) {
        db.createObjectStore('mediciones', { keyPath: 'fecha' });
      }

      // Notas clínicas
      if (!db.objectStoreNames.contains('notas')) {
        const store = db.createObjectStore('notas', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha');
      }

      // Configuración
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    }
  });

  return dbInstance;
}
