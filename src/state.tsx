import { createContext, type Dispatch, useContext } from "react";

import type { Category, Checklist, ChecklistDatabase, ChecklistItem, ItemType, Section } from "./checklist";
import type { CasMessage } from "./lib/cas";
import { seedDatabases } from "./mockData";
import { uid } from "./schemas";

/** The two categories whose checklists are grouped into named sections. */
export type SectionedCategory = "non_normal" | "procedure";

/* ── list location within the selected checklist ──────────────── */
export type ListLoc = { kind: "root" } | { kind: "branch"; parentId: string; key: string };

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

/* ── sidebar checklist-tree drop targets ─────────────────────────
 * Distinct from checklist ids so a drop onto an empty (or trailing) list can
 * still resolve to a container even when there's nothing to drop "onto". */
export const NORMAL_DROP_ID = "checklist-drop:normal";
export function sectionDropId(sectionId: string): string {
    return `checklist-drop:section:${sectionId}`;
}
export function parseSectionDropId(id: string): string | null {
    const m = id.match(/^checklist-drop:section:(.+)$/);
    return m ? m[1] : null;
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
    | { type: "set-checklist-cas"; id: string; cas: CasMessage | undefined }
    | { type: "set-checklist-phase"; id: string; phase: Checklist["phase"] }
    | { type: "update-item"; itemId: string; patch: Partial<ChecklistItem> }
    | { type: "add-item"; loc: ListLoc; itemType: ItemType; index?: number }
    | { type: "delete-item"; itemId: string }
    | { type: "drag-over"; activeId: string; overId: string }
    | { type: "drag-end"; activeId: string; overId: string }
    | { type: "add-branch"; itemId: string }
    | { type: "rename-branch"; itemId: string; oldKey: string; newKey: string }
    | { type: "delete-branch"; itemId: string; key: string }
    | { type: "copy-branch"; itemId: string; fromKey: string }
    | { type: "add-checklist"; dbId: string; category: Category; sectionId?: string }
    | { type: "delete-checklist"; id: string }
    | { type: "delete-database"; dbId: string }
    | { type: "rename-database"; dbId: string; name: string }
    | { type: "set-database-part-number"; dbId: string; partNumber: string | undefined }
    | { type: "add-section"; dbId: string; category: SectionedCategory }
    | { type: "rename-section"; dbId: string; category: SectionedCategory; id: string; name: string }
    | { type: "delete-section"; dbId: string; category: SectionedCategory; id: string }
    | { type: "reorder-sections"; dbId: string; category: SectionedCategory; activeId: string; overId: string }
    | {
          type: "move-checklist";
          dbId: string;
          checklistId: string;
          toCategory: Category;
          toSectionId?: string;
          overId?: string;
      }
    | { type: "import-checklist"; dbId: string; category: Category; sectionId?: string; checklist: Checklist }
    | { type: "import-database"; database: ChecklistDatabase }
    | { type: "add-database" };

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
function removeItem(items: ChecklistItem[], id: string): { tree: ChecklistItem[]; removed: ChecklistItem | null } {
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
function replaceList(items: ChecklistItem[], loc: ListLoc, newList: ChecklistItem[]): ChecklistItem[] {
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
        case "conditional":
            return { type, id, challenge: "New condition?", paths: { YES: [], NO: [] } };
        case "multi-select":
            return { type, id, challenge: "New selection:", paths: { "Option 1": [] } };
        case "free-text":
            return { type, id, text: "New text…" };
        case "form-feed":
            return { type, id };
        case "note":
            return { type, id, text: "", level: "note" };
    }
}

/** Deep-clone an item tree with freshly generated ids. */
function cloneItemTree(it: ChecklistItem): ChecklistItem {
    const id = uid("i");
    if (it.type === "conditional") {
        return { ...it, id, paths: { YES: it.paths.YES.map(cloneItemTree), NO: it.paths.NO.map(cloneItemTree) } };
    }
    if (it.type === "multi-select") {
        return {
            ...it,
            id,
            paths: Object.fromEntries(Object.entries(it.paths).map(([k, v]) => [k, v.map(cloneItemTree)])),
        };
    }
    return { ...it, id };
}

/* ── database-scoped helpers (normal flat, non_normal & procedure sectioned) ── */

export function allChecklists(db: ChecklistDatabase): Checklist[] {
    return [
        ...db.categories.normal,
        ...db.categories.non_normal.flatMap((sec) => sec.checklists),
        ...db.categories.procedure.flatMap((sec) => sec.checklists),
    ];
}

function sectionsOf(db: ChecklistDatabase, category: SectionedCategory): Section[] {
    return db.categories[category];
}

function withSections(db: ChecklistDatabase, category: SectionedCategory, sections: Section[]): ChecklistDatabase {
    return { ...db, categories: { ...db.categories, [category]: sections } };
}

/** Locate which category (and, for sectioned categories, which section) holds a checklist. */
export function locateChecklist(
    db: ChecklistDatabase,
    checklistId: string,
): { category: Category; section: Section | null } | null {
    if (db.categories.normal.some((cl) => cl.id === checklistId)) return { category: "normal", section: null };
    for (const category of ["non_normal", "procedure"] as const) {
        for (const sec of sectionsOf(db, category)) {
            if (sec.checklists.some((cl) => cl.id === checklistId)) return { category, section: sec };
        }
    }
    return null;
}

function updateChecklistInDb(db: ChecklistDatabase, id: string, fn: (cl: Checklist) => Checklist): ChecklistDatabase {
    return {
        ...db,
        categories: {
            normal: db.categories.normal.map((cl) => (cl.id === id ? fn(cl) : cl)),
            non_normal: db.categories.non_normal.map((sec) => ({
                ...sec,
                checklists: sec.checklists.map((cl) => (cl.id === id ? fn(cl) : cl)),
            })),
            procedure: db.categories.procedure.map((sec) => ({
                ...sec,
                checklists: sec.checklists.map((cl) => (cl.id === id ? fn(cl) : cl)),
            })),
        },
    };
}

function removeChecklistFromDb(db: ChecklistDatabase, id: string): ChecklistDatabase {
    return {
        ...db,
        categories: {
            normal: db.categories.normal.filter((cl) => cl.id !== id),
            non_normal: db.categories.non_normal.map((sec) => ({
                ...sec,
                checklists: sec.checklists.filter((cl) => cl.id !== id),
            })),
            procedure: db.categories.procedure.map((sec) => ({
                ...sec,
                checklists: sec.checklists.filter((cl) => cl.id !== id),
            })),
        },
    };
}

/** Removes a checklist from wherever it currently lives (normal, or any
 *  section), returning the updated database and the removed checklist. */
function removeChecklistAnywhere(
    db: ChecklistDatabase,
    id: string,
): { db: ChecklistDatabase; checklist: Checklist | null } {
    const normalIdx = db.categories.normal.findIndex((cl) => cl.id === id);
    if (normalIdx >= 0) {
        const checklist = db.categories.normal[normalIdx];
        return { db: removeChecklistFromDb(db, id), checklist };
    }
    for (const category of ["non_normal", "procedure"] as const) {
        for (const sec of sectionsOf(db, category)) {
            const checklist = sec.checklists.find((cl) => cl.id === id);
            if (checklist) return { db: removeChecklistFromDb(db, id), checklist };
        }
    }
    return { db, checklist: null };
}

/** Inserts a checklist into `category` (and, for sectioned categories,
 *  `sectionId`) at `index`. The index must be resolved against the list
 *  *before* the checklist was removed from wherever it used to live — for a
 *  same-container move that's the same array, and re-deriving the index from
 *  the post-removal list would land one slot early (mirrors `arrayMove`,
 *  which likewise splices at the pre-removal target index). */
function insertChecklist(
    db: ChecklistDatabase,
    category: Category,
    sectionId: string | undefined,
    checklist: Checklist,
    index: number,
): ChecklistDatabase {
    if (category === "normal") {
        const list = db.categories.normal.slice();
        list.splice(Math.max(0, Math.min(index, list.length)), 0, checklist);
        return { ...db, categories: { ...db.categories, normal: list } };
    }
    if (!sectionId) return db;
    const nextSections = sectionsOf(db, category).map((sec) => {
        if (sec.id !== sectionId) return sec;
        const list = sec.checklists.slice();
        list.splice(Math.max(0, Math.min(index, list.length)), 0, checklist);
        return { ...sec, checklists: list };
    });
    return withSections(db, category, nextSections);
}

/* ── checklist-scoped update ───────────────────────────────────── */

function mapSelectedChecklist(state: AppState, fn: (cl: Checklist) => Checklist): AppState {
    const id = state.selectedChecklistId;
    if (!id) return state;
    return {
        ...state,
        databases: state.databases.map((db) => updateChecklistInDb(db, id, fn)),
    };
}

function mapSelectedItems(state: AppState, fn: (items: ChecklistItem[]) => ChecklistItem[]): AppState {
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
                databases: state.databases.map((db) =>
                    updateChecklistInDb(db, action.id, (cl) => ({ ...cl, name: action.name })),
                ),
            };

        case "set-checklist-cas":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    updateChecklistInDb(db, action.id, (cl) => ({ ...cl, cas: action.cas })),
                ),
            };

        case "set-checklist-phase":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    updateChecklistInDb(db, action.id, (cl) => ({ ...cl, phase: action.phase })),
                ),
            };

        case "update-item":
            return mapSelectedItems(state, (items) =>
                updateItem(items, action.itemId, (it) => ({ ...it, ...action.patch }) as ChecklistItem),
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

        case "copy-branch":
            return mapSelectedItems(state, (items) =>
                updateItem(items, action.itemId, (it) => {
                    if (it.type === "conditional") {
                        if (action.fromKey !== "YES" && action.fromKey !== "NO") return it;
                        const source = it.paths[action.fromKey];
                        const otherKey = action.fromKey === "YES" ? "NO" : "YES";
                        return { ...it, paths: { ...it.paths, [otherKey]: source.map(cloneItemTree) } };
                    }
                    if (it.type === "multi-select") {
                        const source = it.paths[action.fromKey];
                        if (!source) return it;
                        const paths: Record<string, ChecklistItem[]> = { ...it.paths };
                        for (const key of Object.keys(paths)) {
                            if (key !== action.fromKey) paths[key] = source.map(cloneItemTree);
                        }
                        return { ...it, paths };
                    }
                    return it;
                }),
            );

        case "add-checklist": {
            if (action.category !== "normal" && !action.sectionId) return state;
            const cl: Checklist = { kind: "checklist", id: uid("cl"), name: "Untitled Checklist", items: [] };
            return {
                ...state,
                selectedChecklistId: cl.id,
                databases: state.databases.map((db) => {
                    if (db.id !== action.dbId) return db;
                    if (action.category === "normal") {
                        return { ...db, categories: { ...db.categories, normal: [...db.categories.normal, cl] } };
                    }
                    const category = action.category;
                    return withSections(
                        db,
                        category,
                        sectionsOf(db, category).map((sec) =>
                            sec.id === action.sectionId ? { ...sec, checklists: [...sec.checklists, cl] } : sec,
                        ),
                    );
                }),
            };
        }

        case "delete-checklist": {
            const databases = state.databases.map((db) => removeChecklistFromDb(db, action.id));
            const stillSelected = state.selectedChecklistId === action.id ? null : state.selectedChecklistId;
            return { ...state, databases, selectedChecklistId: stillSelected };
        }

        case "delete-database": {
            const databases = state.databases.filter((db) => db.id !== action.dbId);
            const selectionExists =
                state.selectedChecklistId != null &&
                databases.some((db) => allChecklists(db).some((cl) => cl.id === state.selectedChecklistId));
            return {
                ...state,
                databases,
                selectedChecklistId: selectionExists ? state.selectedChecklistId : null,
            };
        }

        case "rename-database":
            return {
                ...state,
                databases: state.databases.map((db) => (db.id === action.dbId ? { ...db, name: action.name } : db)),
            };

        case "set-database-part-number":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId ? { ...db, partNumber: action.partNumber } : db,
                ),
            };

        case "add-section": {
            const section: Section = { kind: "section", id: uid("sec"), name: "New Section", checklists: [] };
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? withSections(db, action.category, [...sectionsOf(db, action.category), section])
                        : db,
                ),
            };
        }

        case "rename-section":
            return {
                ...state,
                databases: state.databases.map((db) =>
                    db.id === action.dbId
                        ? withSections(
                              db,
                              action.category,
                              sectionsOf(db, action.category).map((sec) =>
                                  sec.id === action.id ? { ...sec, name: action.name } : sec,
                              ),
                          )
                        : db,
                ),
            };

        case "delete-section": {
            let clearSelection = false;
            const databases = state.databases.map((db) => {
                if (db.id !== action.dbId) return db;
                const target = sectionsOf(db, action.category).find((sec) => sec.id === action.id);
                if (target?.checklists.some((cl) => cl.id === state.selectedChecklistId)) clearSelection = true;
                return withSections(
                    db,
                    action.category,
                    sectionsOf(db, action.category).filter((sec) => sec.id !== action.id),
                );
            });
            return {
                ...state,
                databases,
                selectedChecklistId: clearSelection ? null : state.selectedChecklistId,
            };
        }

        case "reorder-sections":
            return {
                ...state,
                databases: state.databases.map((db) => {
                    if (db.id !== action.dbId) return db;
                    const list = sectionsOf(db, action.category);
                    const from = list.findIndex((s) => s.id === action.activeId);
                    const to = list.findIndex((s) => s.id === action.overId);
                    if (from < 0 || to < 0 || from === to) return db;
                    return withSections(db, action.category, arrayMove(list, from, to));
                }),
            };

        case "move-checklist": {
            if (action.toCategory !== "normal" && !action.toSectionId) return state;
            return {
                ...state,
                databases: state.databases.map((db) => {
                    if (db.id !== action.dbId) return db;

                    // Resolve the drop index against the list *before* removal (see
                    // insertChecklist's doc comment) — for a same-container move this
                    // is the same array the checklist is about to be removed from.
                    const targetList =
                        action.toCategory === "normal"
                            ? db.categories.normal
                            : (sectionsOf(db, action.toCategory).find((s) => s.id === action.toSectionId)?.checklists ??
                              []);
                    const rawIndex = action.overId ? targetList.findIndex((cl) => cl.id === action.overId) : -1;
                    const toIndex = rawIndex < 0 ? targetList.length : rawIndex;

                    const { db: removedDb, checklist } = removeChecklistAnywhere(db, action.checklistId);
                    if (!checklist) return db;
                    return insertChecklist(removedDb, action.toCategory, action.toSectionId, checklist, toIndex);
                }),
            };
        }

        case "import-checklist":
            return {
                ...state,
                selectedChecklistId: action.checklist.id,
                databases: state.databases.map((db) => {
                    if (db.id !== action.dbId) return db;
                    if (action.category === "normal") {
                        return {
                            ...db,
                            categories: { ...db.categories, normal: [...db.categories.normal, action.checklist] },
                        };
                    }
                    const category = action.category;
                    let sections = sectionsOf(db, category);
                    let sectionId = action.sectionId;
                    if (!sectionId) {
                        const existing = sections.find((sec) => sec.name === "Imported");
                        if (existing) {
                            sectionId = existing.id;
                        } else {
                            const section: Section = {
                                kind: "section",
                                id: uid("sec"),
                                name: "Imported",
                                checklists: [],
                            };
                            sections = [...sections, section];
                            sectionId = section.id;
                        }
                    }
                    return withSections(
                        db,
                        category,
                        sections.map((sec) =>
                            sec.id === sectionId ? { ...sec, checklists: [...sec.checklists, action.checklist] } : sec,
                        ),
                    );
                }),
            };

        case "import-database": {
            const first = allChecklists(action.database)[0];
            return {
                ...state,
                databases: [...state.databases, action.database],
                selectedChecklistId: first ? first.id : state.selectedChecklistId,
            };
        }

        case "add-database": {
            const database: ChecklistDatabase = {
                id: uid("db"),
                name: "Untitled Package",
                categories: { normal: [], non_normal: [], procedure: [] },
            };
            return { ...state, databases: [...state.databases, database] };
        }
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
    for (const db of databases) {
        const first = allChecklists(db)[0];
        if (first) {
            selected = first.id;
            break;
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

export function useSelectedChecklist(): {
    checklist: Checklist | null;
    db: ChecklistDatabase | null;
    category: Category | null;
    section: Section | null;
} {
    const state = useAppState();
    if (!state.selectedChecklistId) return { checklist: null, db: null, category: null, section: null };
    for (const db of state.databases) {
        const checklist = allChecklists(db).find((cl) => cl.id === state.selectedChecklistId);
        if (checklist) {
            const loc = locateChecklist(db, checklist.id);
            return { checklist, db, category: loc?.category ?? null, section: loc?.section ?? null };
        }
    }
    return { checklist: null, db: null, category: null, section: null };
}
