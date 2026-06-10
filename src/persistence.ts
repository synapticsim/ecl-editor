const DB_NAME = "synaptic-checklist-editor";
const STORE = "state";
const KEY = "app";

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE)) {
                req.result.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function loadPersisted<T>(): Promise<T | null> {
    try {
        const db = await openDb();
        return await new Promise<T | null>((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const req = tx.objectStore(STORE).get(KEY);
            req.onsuccess = () => resolve((req.result as T) ?? null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
}

export async function savePersisted(value: unknown): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
