import { createContext, useContext, type Dispatch } from "react";
import type {
    Category,
    Checklist,
    ChecklistDatabase,
    ChecklistItem,
    CategoryEntry,
    ItemType,
    SectionHeader,
} from "./checklist";
import { isHeader } from "./checklist";
import { uid } from "./schemas";
import { seedDatabases } from "./mockData";

/* ── list location within the selected checklist ──────────────── */
export type ListLoc =
    | { kind: "root" }
    | { kind: "branch"; parentId: string; key: string };

export const ROOT_DROP_ID = "list:root";
export function branchDropId(parentId: string, key: string): string {
    return `list:branch:${parentId}:${encodeURIComponent(key)}`;
}
export function parseDropId(id: string): ListLoc | null {
    if (id === ROOT_DROP_ID) return { kind: "root" };
    const m = id.match(/^list:branch:([^:]+):(.+)$/);
    if (m) return { kind: "branch", parentId: m[1], key: decodeURIComponent(m[2]) };
    return null;
}

export interface AppState {
    databases: ChecklistDatabase[];
    selectedChecklistId: string | null;
}

export type SaveStatus = "saving" | "saved";

export type Action =
    | { type: "hydrate"; state: AppState }
    | { type: "select"; id: string }
    | { type: "set-checklist-name"; id: string; name: string }
    | { type: "update-item"; itemId: string; patch: Partial<ChecklistItem> }
    | { type: "add-item"; loc: ListLoc; itemType: ItemType; index?: number }
    | { type: "delete-item"; itemId: string }
    | { type: "drag-over"; activeId: string; overId: string }
    | { type: "drag-end"; activeId: string; overId: string }
    | { type: "add-branch"; itemId: string }
    | { type: "rename-branch"; itemId: string; oldKey: string; newKey: string }
    | { type: "delete-branch"; itemId: string; key: string }
    | { type: "add-checklist"; dbId: string; category: Category }
    | { type: "delete-checklist"; id: string }
    | { type: "delete-database"; dbId: string }
    | { type: "rename-database"; dbId: string; name: string }
    | { type: "add-section-header"; dbId: string; category: Category }
    | { type: "rename-header"; dbId: string; category: Category; id: string; name: string }
    | { type: "delete-header"; dbId: string; category: Category; id: string }
    | { type: "reorder-category"; dbId: string; category: Category; activeId: string; overId: string }
    | { type: "import-checklist"; dbId: string; category: Category; checklist: Checklist };

/* ── recursive tree helpers (pure) ─────────────────────────────── */

function childKeys(it: ChecklistItem): string[] {
    if (it.type === "conditional") return ["YES", "NO"];
    if (it.type === "multi-select") return Object.keys(it.paths);
    return [];
}
function getChildList(it: ChecklistItem, key: string): ChecklistItem[] {
    if (it.type === "conditional") return it.paths[key as "YES" | "NO"];
    if (it.type === "multi-select") return it.paths[key];
    return [];
}
function withChildList(it: ChecklistItem, key: string, list: ChecklistItem[]): ChecklistItem {
    if (it.type === "conditional") {
        return { ...it, paths: { ...it.paths, [key]: list } };
    }
    if (it.type === "multi-select") {
        return { ...it, paths: { ...it.paths, [key]: list } };
    }
    return it;
}

function findItem(items: ChecklistItem[], id: string): ChecklistItem | null {
    for (const it of items) {
        if (it.id === id) return it;
        for (const k of childKeys(it)) {
            const found = findItem(getChildList(it, k), id);
            if (found) return found;
        }
    }
    return null;
}

/** Update one item by id, returning a new tree. */
function updateItem(
    items: ChecklistItem[],
    id: string,
    updater: (it: ChecklistItem) => ChecklistItem,
): ChecklistItem[] {
    return items.map((it) => {
        if (it.id === id) return updater(it);
        let next = it;
        for (const k of childKeys(it)) {
            const list = getChildList(it, k);
            const updated = updateItem(list, id, updater);
            if (updated !== list) next = withChildList(next, k, updated);
        }
        return next;
    });
}

/** Remove an item by id; returns the new tree and the removed item. */
function removeItem(
    items: ChecklistItem[],
    id: string,
): { tree: ChecklistItem[]; removed: ChecklistItem | null } {
    let removed: ChecklistItem | null = null;
    const tree: ChecklistItem[] = [];
    for (const it of items) {
        if (it.id === id) {
            removed = it;
            continue;
        }
        let next = it;
        for (const k of childKeys(it)) {
            const r = removeItem(getChildList(it, k), id);
            if (r.removed) {
                removed = r.removed;
                next = withChildList(next, k, r.tree);
            }
        }
        tree.push(next);
    }
    return { tree, removed };
}

/** Replace the list at the given location. */
function replaceList(
    items: ChecklistItem[],
    loc: ListLoc,
    newList: ChecklistItem[],
): ChecklistItem[] {
    if (loc.kind === "root") return newList;
    return updateItem(items, loc.parentId, (it) => withChildList(it, loc.key, newList));
}

/** Find the location + index of an item within the tree. */
function locateItem(
    items: ChecklistItem[],
    id: string,
    loc: ListLoc = { kind: "root" },
): { loc: ListLoc; index: number } | null {
    const idx = items.findIndex((it) => it.id === id);
    if (idx >= 0) return { loc, index: idx };
    for (const it of items) {
        for (const k of childKeys(it)) {
            const found = locateItem(getChildList(it, k), id, {
                kind: "branch",
                parentId: it.id,
                key: k,
            });
            if (found) return found;
        }
    }
    return null;
}

function makeItem(type: ItemType): ChecklistItem {
    const id = uid("i");
    switch (type) {
        case "action":
            return { type, id, challenge: "NEW ITEM", response: "" };
        case "sensed":
            return { type, id, challenge: "NEW ITEM", response: "", sensed: "" };
        case "conditional":
            return { type, id, challenge: "New condition?", paths: { YES: [], NO: [] } };
        case "multi-select":
            return { type, id, challenge: "New selection:", paths: { "Option 1": [] } };
        case "free-text":
            return { type, id, text: "New text…" };
        case "form-feed":
            return { type, id };
    }
}

/* ── checklist-scoped update ───────────────────────────────────── */

function mapSelectedChecklist(
    state: AppState,
    fn: (cl: Checklist) => Checklist,
): AppState {
    const id = state.selectedChecklistId;
    if (!id) return state;
    return {
        ...state,
        databases: state.databases.map((db) => ({
            ...db,
            categories: mapCategories(db.categories, (entry) =>
                !isHeader(entry) && entry.id === id ? fn(entry) : entry,
            ),
        })),
    };
}

function mapCategories(
    categories: ChecklistDatabase["categories"],
    fn: (entry: CategoryEntry) => CategoryEntry,
): ChecklistDatabase["categories"] {
    return {
        normal: categories.normal.map(fn),
        "non-normal": categories["non-normal"].map(fn),
        procedure: categories.procedure.map(fn),
    };
}

function mapSelectedItems(
    state: AppState,
    fn: (items: ChecklistItem[]) => ChecklistItem[],
): AppState {
    return mapSelectedChecklist(state, (cl) => ({ ...cl, items: fn(cl.items) }));
}

/* ── reducer ───────────────────────────────────────────────────── */

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "hydrate":
            return action.state;

        case "select":
            return { ...state, selectedChecklistId: action.id };

        case "set-checklist-name":
            return {
                ...state,
                databases: state.databases.map((db) => ({
                    ...db,
                    categories: mapCategories(db.categories, (e) =>
                        !isHeader(e) && e.id === action.id ? { ...e, name: action.name } : e,
                    ),
                })),
            };

        case "update-item":
            return mapSelectedItems(state, (items) =>
                updateItem(items, action.itemId, (it) => ({ ...it, ...action.patch } as ChecklistItem)),
            );

        case "add-item":
            return mapSelectedItems(state, (items) => {
                const newItem = makeItem(action.itemType);
                const target = locateBranchList(items, action.loc);
                const at = action.index ?? target.length;
                const next = target.slice();
                next.splice(Math.max(0, Math.min(at, next.length)), 0, newItem);
                return replaceList(items, action.loc, next);
            });

        case "delete-item":
            return mapSelectedItems(state, (items) => removeItem(items, action.itemId).tree);

        case "drag-over":
        case "drag-end": {
            // drag-over only relocates across containers (so the target group's
            // items shift live); same-container ordering is finalised on drag-end.
            const crossOnly = action.type === "drag-over";
            let changed = false;
            const next = mapSelectedItems(state, (items) => {
                const moved = computeMove(items, action.activeId, action.overId, crossOnly);
                if (moved) {
                    changed = true;
                    return moved;
                }
                return items;
            });
            return changed ? next : state;
        }

        case "add-branch":
            return mapSelectedItems(state, (items) =>
                updateItem(items, action.itemId, (it) => {
                    if (it.type !== "multi-select") return it;
                    let n = Object.keys(it.paths).length + 1;
                    let key = `Option ${n}`;
                    while (key in it.paths) key = `Option ${++n}`;
                    return { ...it, paths: { ...it.paths, [key]: [] } };
                }),
            );

        case "rename-branch":
            return mapSelectedItems(state, (items) =>
                updateItem(items, action.itemId, (it) => {
                    if (it.type !== "multi-select") return it;
                    if (action.newKey === action.oldKey) return it;
                    if (!action.newKey || action.newKey in it.paths) return it;
                    const paths: Record<string, ChecklistItem[]> = {};
                    for (const [k, v] of Object.entries(it.paths)) {
                        paths[k === action.oldKey ? action.newKey : k] = v;
                    }
                    return { ...it, paths };
                }),
            );

        case "delete-branch":
            return mapSelectedItems(state, (items) =>
                updateItem(items, action.itemId, (it) => {
                    if (it.type !== "multi-select") return it;
                    if (Object.keys(it.paths).length <= 1) return it;
                    const paths = { ...it.paths };
                    delete paths[action.key];
                    return { ...it, paths };
                }),
            );

        case "add-checklist": {
            const cl: Checklist = {
                kind: "checklist",
                id: uid("cl"),
                name: "Untitled Checklist",
                category: action.category,
                items: [],
            };
            return {
                ...state,
                selectedChecklistId: cl.id,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? {
                              ...db,
                              categories: {
                                  ...db.categories,
                                  [action.category]: [...db.categories[action.category], cl],
                              },
                          }
                        : db,
                ),
            };
        }

        case "delete-checklist": {
            const databases = state.databases.map((db) => ({
                ...db,
                categories: mapCategories(db.categories, (e) => e) as ChecklistDatabase["categories"],
            }));
            for (const db of databases) {
                for (const cat of Object.keys(db.categories) as Category[]) {
                    db.categories[cat] = db.categories[cat].filter(
                        (e) => isHeader(e) || e.id !== action.id,
                    );
                }
            }
            const stillSelected =
                state.selectedChecklistId === action.id ? null : state.selectedChecklistId;
            return { ...state, databases, selectedChecklistId: stillSelected };
        }

        case "delete-database": {
            const databases = state.databases.filter((db) => db.id !== action.dbId);
            const selectionExists =
                state.selectedChecklistId != null &&
                databases.some((db) =>
                    Object.values(db.categories).some((cat) =>
                        cat.some((e) => !isHeader(e) && e.id === state.selectedChecklistId),
                    ),
                );
            return {
                ...state,
                databases,
                selectedChecklistId: selectionExists ? state.selectedChecklistId : null,
            };
        }

        case "rename-database":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId ? { ...db, name: action.name } : db,
                ),
            };

        case "add-section-header": {
            const header: SectionHeader = { kind: "header", id: uid("h"), name: "New Section" };
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? {
                              ...db,
                              categories: {
                                  ...db.categories,
                                  [action.category]: [...db.categories[action.category], header],
                              },
                          }
                        : db,
                ),
            };
        }

        case "rename-header":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? {
                              ...db,
                              categories: {
                                  ...db.categories,
                                  [action.category]: db.categories[action.category].map((e) =>
                                      isHeader(e) && e.id === action.id
                                          ? { ...e, name: action.name }
                                          : e,
                                  ),
                              },
                          }
                        : db,
                ),
            };

        case "delete-header":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? {
                              ...db,
                              categories: {
                                  ...db.categories,
                                  [action.category]: db.categories[action.category].filter(
                                      (e) => !(isHeader(e) && e.id === action.id),
                                  ),
                              },
                          }
                        : db,
                ),
            };

        case "reorder-category":
            return {
                ...state,
                databases: state.databases.map((db) => {
                    if (db.id !== action.dbId) return db;
                    const list = db.categories[action.category];
                    const from = list.findIndex((e) => e.id === action.activeId);
                    const to = list.findIndex((e) => e.id === action.overId);
                    if (from < 0 || to < 0 || from === to) return db;
                    const next = list.slice();
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    return { ...db, categories: { ...db.categories, [action.category]: next } };
                }),
            };

        case "import-checklist":
            return {
                ...state,
                selectedChecklistId: action.checklist.id,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? {
                              ...db,
                              categories: {
                                  ...db.categories,
                                  [action.category]: [
                                      ...db.categories[action.category],
                                      action.checklist,
                                  ],
                              },
                          }
                        : db,
                ),
            };
    }
}

function locateBranchList(items: ChecklistItem[], loc: ListLoc): ChecklistItem[] {
    if (loc.kind === "root") return items;
    const parent = findItem(items, loc.parentId);
    return parent ? getChildList(parent, loc.key) : [];
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const next = arr.slice();
    const clamped = to < 0 ? next.length + to : to;
    next.splice(clamped, 0, next.splice(from, 1)[0]);
    return next;
}

function sameLoc(a: ListLoc, b: ListLoc): boolean {
    if (a.kind === "root" && b.kind === "root") return true;
    return a.kind === "branch" && b.kind === "branch" && a.parentId === b.parentId && a.key === b.key;
}

/**
 * Returns a new item tree with `activeId` moved relative to `overId`, or `null`
 * if nothing changed. Same-container reordering uses arrayMove on the original
 * indices (so forward moves aren't off by one); cross-container moves splice the
 * item into the target list. When `crossOnly` is set, same-container moves are
 * skipped (used during drag-over — the SortableContext animates those natively).
 */
function computeMove(
    items: ChecklistItem[],
    activeId: string,
    overId: string,
    crossOnly: boolean,
): ChecklistItem[] | null {
    if (activeId === overId) return null;
    const active = locateItem(items, activeId);
    if (!active) return null;

    // Resolve the drop target list + index.
    const dropLoc = parseDropId(overId);
    let targetLoc: ListLoc;
    let targetIndex: number;
    let overContainer = false;
    if (dropLoc) {
        targetLoc = dropLoc;
        targetIndex = locateBranchList(items, dropLoc).length;
        overContainer = true;
    } else {
        const over = locateItem(items, overId);
        if (!over) return null;
        targetLoc = over.loc;
        targetIndex = over.index;
    }

    if (sameLoc(active.loc, targetLoc)) {
        if (crossOnly) return null;
        const list = locateBranchList(items, targetLoc);
        const to = overContainer ? list.length - 1 : targetIndex;
        if (active.index === to) return null;
        return replaceList(items, targetLoc, arrayMove(list, active.index, to));
    }

    // Cross-container: don't allow dropping a block into its own descendant.
    const activeItem = findItem(items, activeId);
    if (targetLoc.kind === "branch" && activeItem && isDescendant(activeItem, targetLoc.parentId)) {
        return null;
    }

    const { tree, removed } = removeItem(items, activeId);
    if (!removed) return null;
    const list = locateBranchList(tree, targetLoc).slice();
    const i = Math.max(0, Math.min(targetIndex, list.length));
    list.splice(i, 0, removed);
    return replaceList(tree, targetLoc, list);
}

function isDescendant(item: ChecklistItem, id: string): boolean {
    if (item.id === id) return true;
    for (const k of childKeys(item)) {
        for (const child of getChildList(item, k)) {
            if (isDescendant(child, id)) return true;
        }
    }
    return false;
}

/* ── context ───────────────────────────────────────────────────── */

export const StateContext = createContext<AppState | null>(null);
export const DispatchContext = createContext<Dispatch<Action> | null>(null);
export const StatusContext = createContext<SaveStatus>("saved");

export function useSaveStatus(): SaveStatus {
    return useContext(StatusContext);
}

export { reducer };

export function init(): AppState {
    const databases = seedDatabases();
    // Select the first available checklist, if any exist.
    let selected: string | null = null;
    outer: for (const db of databases) {
        for (const cat of Object.values(db.categories)) {
            for (const entry of cat) {
                if (!isHeader(entry)) {
                    selected = entry.id;
                    break outer;
                }
            }
        }
    }
    return { databases, selectedChecklistId: selected };
}

export function useAppState(): AppState {
    const ctx = useContext(StateContext);
    if (!ctx) throw new Error("useAppState must be used within StoreProvider");
    return ctx;
}

export function useDispatch(): Dispatch<Action> {
    const ctx = useContext(DispatchContext);
    if (!ctx) throw new Error("useDispatch must be used within StoreProvider");
    return ctx;
}

export function useSelectedChecklist(): { checklist: Checklist | null; db: ChecklistDatabase | null } {
    const state = useAppState();
    if (!state.selectedChecklistId) return { checklist: null, db: null };
    for (const db of state.databases) {
        for (const cat of Object.values(db.categories)) {
            for (const entry of cat) {
                if (!isHeader(entry) && entry.id === state.selectedChecklistId) {
                    return { checklist: entry, db };
                }
            }
        }
    }
    return { checklist: null, db: null };
}
