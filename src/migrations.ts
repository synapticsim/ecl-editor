import type { Checklist, ChecklistDatabase, ChecklistItem, Section } from "./checklist";
import { varIndex } from "./lib/vars";
import { uid } from "./schemas";
import type { AppState } from "./state";

/**
 * Defensively normalizes whatever shape was last persisted (IndexedDB isn't
 * schema-validated) into the current AppState shape, so older saved data keeps
 * working across schema changes instead of getting wiped:
 *  - normal stays a flat checklist array; non_normal and procedure are now both
 *    `Section[]`. Older saves may have them as a flat array (optionally with
 *    legacy `{ kind: "header" }` markers interleaved) — those get grouped into
 *    sections, with any ungrouped leading checklists landing in an implicit
 *    "General" section.
 *  - the non-normal category key used to be hyphenated ("non-normal"); it's now
 *    "non_normal" so it doesn't need bracket-syntax access. Older saves are read
 *    from either key.
 *  - SensedItem.sensed used to be the ECL_VARIABLE name (string); it's now the
 *    numeric ECL_VARIABLE index. Names that no longer resolve are left unset
 *    rather than dropping the item.
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
    return [
        ...db.categories.normal,
        ...db.categories.non_normal.flatMap((sec) => sec.checklists),
        ...db.categories.procedure.flatMap((sec) => sec.checklists),
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
            normal: migrateFlatCategory(categories.normal),
            non_normal: migrateSectionedCategory(categories.non_normal ?? categories["non-normal"]),
            procedure: migrateSectionedCategory(categories.procedure),
        },
    };
}

function isRawHeader(e: unknown): e is { kind: "header"; id?: string; name?: string } {
    return !!e && typeof e === "object" && (e as Record<string, unknown>).kind === "header";
}

function isRawSection(e: unknown): e is { kind: "section"; id?: string; name?: string; checklists?: unknown[] } {
    return !!e && typeof e === "object" && (e as Record<string, unknown>).kind === "section";
}

/** normal: drop any legacy section-header markers, keep checklists flat. */
function migrateFlatCategory(raw: unknown): Checklist[] {
    if (!Array.isArray(raw)) return [];
    const out: Checklist[] = [];
    for (const e of raw) {
        if (isRawHeader(e) || isRawSection(e)) continue;
        const cl = migrateChecklist(e);
        if (cl) out.push(cl);
    }
    return out;
}

/** non_normal/procedure: already-nested Section[], or a legacy flat list (optionally with
 *  header markers, or a flat checklist array from before sections existed for this category)
 *  to group. */
function migrateSectionedCategory(raw: unknown): Section[] {
    if (!Array.isArray(raw)) return [];

    if (raw.every((e) => isRawSection(e))) {
        return raw.map((sec) => {
            const s = sec as { id?: string; name?: string; checklists?: unknown[] };
            return {
                kind: "section" as const,
                id: typeof s.id === "string" ? s.id : uid("sec"),
                name: typeof s.name === "string" ? s.name : "Section",
                checklists: Array.isArray(s.checklists)
                    ? s.checklists.map(migrateChecklist).filter((c): c is Checklist => c !== null)
                    : [],
            };
        });
    }

    // Legacy flat shape: group each checklist under the nearest preceding header;
    // checklists preceding any header (or a flat checklist array with no headers
    // at all) land in an implicit leading section.
    const sections: Section[] = [];
    let current: Section | null = null;
    for (const e of raw) {
        if (isRawHeader(e)) {
            current = {
                kind: "section",
                id: typeof e.id === "string" ? e.id : uid("sec"),
                name: typeof e.name === "string" ? e.name : "Section",
                checklists: [],
            };
            sections.push(current);
            continue;
        }
        const cl = migrateChecklist(e);
        if (!cl) continue;
        if (!current) {
            current = { kind: "section", id: uid("sec"), name: "General", checklists: [] };
            sections.push(current);
        }
        current.checklists.push(cl);
    }
    return sections;
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
                extension: typeof it.extension === "string" ? it.extension : undefined,
                limitation: typeof it.limitation === "boolean" ? it.limitation : undefined,
                defer: typeof it.defer === "string" ? it.defer : undefined,
                followOn: typeof it.followOn === "string" ? it.followOn : undefined,
                sensed,
                inverted: typeof it.inverted === "boolean" ? it.inverted : undefined,
                latchable: typeof it.latchable === "boolean" ? it.latchable : undefined,
                timer: typeof it.timer === "number" && it.timer > 0 ? it.timer : undefined,
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
                paths: { YES: migrateItems(paths.YES), NO: migrateItems(paths.NO) },
            };
        }
        case "multi-select": {
            const paths = (it.paths && typeof it.paths === "object" ? it.paths : {}) as Record<string, unknown>;
            const migratedPaths: Record<string, ChecklistItem[]> = {};
            for (const [k, v] of Object.entries(paths)) migratedPaths[k] = migrateItems(v);
            return { type: "multi-select", id, challenge, paths: migratedPaths };
        }
        case "free-text":
            return { type: "free-text", id, text: typeof it.text === "string" ? it.text : "" };
        case "form-feed":
            return { type: "form-feed", id };
        default:
            return null;
    }
}
