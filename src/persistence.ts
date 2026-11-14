const DB_NAME = "synaptic-checklist-editor";
const STORE = "state";
const V1_KEY = "app";
const V2_KEY = "app-v2";

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
            const store = db.transaction(STORE, "readonly").objectStore(STORE);
            const req = store.get(V2_KEY);
            req.onsuccess = () => {
                if (req.result !== undefined) {
                    return resolve(req.result as T);
                }

                // Nothing saved by v2 yet: fall back to v1 data. The caller
                // migrates it, and the next save writes it under V2_KEY.
                const legacy = store.get(V1_KEY);
                legacy.onsuccess = () => resolve((legacy.result as T) ?? null);
                legacy.onerror = () => reject(legacy.error);
            };
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
        tx.objectStore(STORE).put(value, V2_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
