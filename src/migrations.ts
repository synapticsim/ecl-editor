import type { CategoryEntry, Checklist, ChecklistDatabase, ChecklistItem, ItemPath, Section } from "./checklist";
import { varIndex } from "./lib/vars";
import { uid } from "./schemas";
import type { AppState } from "./state";

/**
 * Defensively normalizes whatever shape was last persisted (IndexedDB isn't
 * schema-validated) into the current AppState shape, so older saved data keeps
 * working across schema changes instead of getting wiped:
 *  - all three categories are now the same interleaved `(Checklist | Section)[]`
 *    shape. Older saves may have `normal` as a flat checklist array, and
 *    non_normal/procedure as either already-nested `Section[]` or a flat array
 *    (optionally with legacy `{ kind: "header" }` markers interleaved) — headers
 *    become sections that gather the checklists following them, and any bare
 *    checklist with no open header becomes a top-level entry directly.
 *  - the non-normal category key used to be hyphenated ("non-normal"); it's now
 *    "non_normal" so it doesn't need bracket-syntax access. Older saves are read
 *    from either key.
 *  - SensedItem.sensed used to be the ECL_VARIABLE name (string); it's now the
 *    numeric ECL_VARIABLE index. Names that no longer resolve are left unset
 *    rather than dropping the item.
 *  - `followOn` used to be a single checklist id string; it's now an array.
 *  - conditional/multi-select branches used to be a bare `ChecklistItem[]`;
 *    they're now `{ items, followOn }`.
 */
export function migrateAppState(raw: unknown): AppState | null {
    if (!raw || typeof raw !== "object") return null;
    const state = raw as Record<string, unknown>;
    if (!Array.isArray(state.databases)) return null;

    const databases = state.databases.map(migrateDatabase).filter((d): d is ChecklistDatabase => d !== null);

    const selectedChecklistId = typeof state.selectedChecklistId === "string" ? state.selectedChecklistId : null;
    const stillExists =
        selectedChecklistId != null &&
        databases.some((db) => allChecklists(db).some((cl) => cl.id === selectedChecklistId));

    return { databases, selectedChecklistId: stillExists ? selectedChecklistId : null };
}

function allChecklists(db: ChecklistDatabase): Checklist[] {
    const flatten = (entries: CategoryEntry[]): Checklist[] =>
        entries.flatMap((e) => (e.kind === "checklist" ? [e] : e.checklists));
    return [
        ...flatten(db.categories.normal),
        ...flatten(db.categories.non_normal),
        ...flatten(db.categories.procedure),
    ];
}

function migrateDatabase(raw: unknown): ChecklistDatabase | null {
    if (!raw || typeof raw !== "object") return null;
    const db = raw as Record<string, unknown>;
    const categories = (db.categories && typeof db.categories === "object" ? db.categories : {}) as Record<
        string,
        unknown
    >;
    return {
        id: typeof db.id === "string" ? db.id : uid("db"),
        name: typeof db.name === "string" ? db.name : "Untitled Database",
        partNumber: typeof db.partNumber === "string" ? db.partNumber : undefined,
        categories: {
            normal: migrateCategoryEntries(categories.normal),
            non_normal: migrateCategoryEntries(categories.non_normal ?? categories["non-normal"]),
            procedure: migrateCategoryEntries(categories.procedure),
        },
    };
}

function isRawHeader(e: unknown): e is { kind: "header"; id?: string; name?: string } {
    return !!e && typeof e === "object" && (e as Record<string, unknown>).kind === "header";
}

function isRawSection(e: unknown): e is { kind: "section"; id?: string; name?: string; checklists?: unknown[] } {
    return !!e && typeof e === "object" && (e as Record<string, unknown>).kind === "section";
}

/** Migrates a category's entries into the current interleaved `CategoryEntry[]`
 *  shape. Handles: an already-nested list of sections/checklists (each entry
 *  migrated in place), and the legacy flat shape (optionally with `{ kind:
 *  "header" }` markers) where a header opens a section that gathers the
 *  checklists following it, and any bare checklist with no open header becomes
 *  a top-level entry directly. */
function migrateCategoryEntries(raw: unknown): CategoryEntry[] {
    if (!Array.isArray(raw)) return [];

    const out: CategoryEntry[] = [];
    let current: Section | null = null;
    for (const e of raw) {
        if (isRawSection(e)) {
            const s = e as { id?: string; name?: string; checklists?: unknown[] };
            // A full section object already owns its own checklists — unlike a
            // legacy header marker, it doesn't stay "open" to absorb whatever
            // bare checklist entries follow it in the array.
            out.push({
                kind: "section",
                id: typeof s.id === "string" ? s.id : uid("sec"),
                name: typeof s.name === "string" ? s.name : "Section",
                checklists: Array.isArray(s.checklists)
                    ? s.checklists.map(migrateChecklist).filter((c): c is Checklist => c !== null)
                    : [],
            });
            current = null;
            continue;
        }
        if (isRawHeader(e)) {
            current = {
                kind: "section",
                id: typeof e.id === "string" ? e.id : uid("sec"),
                name: typeof e.name === "string" ? e.name : "Section",
                checklists: [],
            };
            out.push(current);
            continue;
        }
        const cl = migrateChecklist(e);
        if (!cl) continue;
        if (current) {
            current.checklists.push(cl);
        } else {
            out.push(cl);
        }
    }
    return out;
}

function migrateChecklist(raw: unknown): Checklist | null {
    if (!raw || typeof raw !== "object") return null;
    const cl = raw as Record<string, unknown>;
    const phase = cl.phase;
    return {
        kind: "checklist",
        id: typeof cl.id === "string" ? cl.id : uid("cl"),
        name: typeof cl.name === "string" ? cl.name : "Untitled Checklist",
        items: migrateItems(cl.items),
        // CasMessage is a numeric enum.
        cas: typeof cl.cas === "number" ? (cl.cas as Checklist["cas"]) : undefined,
        phase: phase === "pre-flight" || phase === "in-flight" || phase === "post-flight" ? phase : undefined,
    };
}

function migrateItems(raw: unknown): ChecklistItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(migrateItem).filter((it): it is ChecklistItem => it !== null);
}

function migrateItem(raw: unknown): ChecklistItem | null {
    if (!raw || typeof raw !== "object") return null;
    const it = raw as Record<string, unknown>;
    const id = typeof it.id === "string" ? it.id : uid("i");
    const challenge = typeof it.challenge === "string" ? it.challenge : "";
    const response = typeof it.response === "string" ? it.response : undefined;

    switch (it.type) {
        case "action": {
            let sensed: number | undefined;
            if (typeof it.sensed === "number") sensed = it.sensed;
            else if (typeof it.sensed === "string" && it.sensed) sensed = varIndex(it.sensed);
            return {
                type: "action",
                id,
                challenge,
                response,
                limitation: typeof it.limitation === "boolean" ? it.limitation : undefined,
                defer: typeof it.defer === "string" ? it.defer : undefined,
                followOn: migrateFollowOn(it.followOn),
                sensed,
                inverted: typeof it.inverted === "boolean" ? it.inverted : undefined,
                latchable: typeof it.latchable === "boolean" ? it.latchable : undefined,
                timer: typeof it.timer === "number" && it.timer > 0 ? it.timer : undefined,
                comment: typeof it.comment === "string" ? it.comment : undefined,
            };
        }
        case "sensed": {
            let sensed: number | undefined;
            if (typeof it.sensed === "number") sensed = it.sensed;
            else if (typeof it.sensed === "string" && it.sensed) sensed = varIndex(it.sensed);
            return {
                type: "action",
                id,
                challenge,
                response,
                sensed,
                inverted: typeof it.inverted === "boolean" ? it.inverted : undefined,
                latchable: typeof it.latchable === "boolean" ? it.latchable : undefined,
            };
        }
        case "conditional": {
            const paths = (it.paths && typeof it.paths === "object" ? it.paths : {}) as Record<string, unknown>;
            return {
                type: "conditional",
                id,
                challenge,
                paths: { YES: migratePath(paths.YES), NO: migratePath(paths.NO) },
            };
        }
        case "multi-select": {
            const paths = (it.paths && typeof it.paths === "object" ? it.paths : {}) as Record<string, unknown>;
            const migratedPaths: Record<string, ItemPath> = {};
            for (const [k, v] of Object.entries(paths)) migratedPaths[k] = migratePath(v);
            return { type: "multi-select", id, challenge, paths: migratedPaths };
        }
        case "free-text":
            return {
                type: "free-text",
                id,
                text: typeof it.text === "string" ? it.text : "",
                defer: typeof it.defer === "string" ? it.defer : undefined,
                followOn: migrateFollowOn(it.followOn),
            };
        case "form-feed":
            return { type: "form-feed", id };
        case "note": {
            const level = it.level;
            return {
                type: "note",
                id,
                text: typeof it.text === "string" ? it.text : "",
                level: level === "caution" || level === "warning" ? level : "note",
                defer: typeof it.defer === "string" ? it.defer : undefined,
                followOn: migrateFollowOn(it.followOn),
            };
        }
        default:
            return null;
    }
}

/** Accepts a legacy single string as well as the current array. */
function migrateFollowOn(raw: unknown): string[] | undefined {
    if (Array.isArray(raw)) {
        const ids = raw.filter((x): x is string => typeof x === "string");
        return ids.length > 0 ? ids : undefined;
    }
    return typeof raw === "string" && raw ? [raw] : undefined;
}

/** Accepts a legacy bare item array as well as the current `{ items, followOn }` object. */
function migratePath(raw: unknown): ItemPath {
    if (Array.isArray(raw)) return { items: migrateItems(raw) };
    if (raw && typeof raw === "object") {
        const p = raw as Record<string, unknown>;
        return { items: migrateItems(p.items), followOn: migrateFollowOn(p.followOn) };
    }
    return { items: [] };
}
