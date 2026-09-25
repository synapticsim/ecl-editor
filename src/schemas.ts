import { z } from "zod";

import type { Category, CategoryEntry, Checklist, ChecklistDatabase, ChecklistItem, ItemPath } from "./checklist";
import { casMessageIndex, casMessageName } from "./lib/cas";
import { varIndex, varName } from "./lib/vars";

let counter = 0;
export function uid(prefix = "id"): string {
    counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** On-disk schema version, stamped on every export. a22x (the consumer) refuses
 *  to load a package whose version doesn't match what it was built for; this
 *  repo's own parser stays backward-compatible by structural shape (see
 *  externalPathSchema/followOnSchema below) rather than branching on version. */
export const CURRENT_SCHEMA_VERSION = 2;

/* ── External (on-disk / in-sim) item contract — no editor ids ── */

const baseAction = {
    challenge: z.string(),
    response: z.string().optional(),
};

// CasMessage enum-member name (e.g. "L_ENG_FIRE") is exported. The numeric
// value is also accepted on import for files exported while this stored the
// numeric id instead.
const casMessageSchema = z.union([z.number().int(), z.string()]);
const phaseSchema = z.enum(["pre-flight", "in-flight", "post-flight"]);

const baseSensed = {
    sensed: z.union([z.number().int(), z.string()]).optional(),
    inverted: z.boolean().optional(),
    latchable: z.boolean().optional(),
};

// Accepts a legacy single string as well as the current array, normalizing to
// an array either way so downstream code never has to branch on shape.
const followOnSchema = z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional();

// A conditional/multi-select branch. Accepts a legacy bare item array as well
// as the current `{ items, followOn }` object, normalizing to the object form.
const externalPathSchema: z.ZodType<ExternalPath> = z.lazy(() =>
    z.union([
        z.array(externalItemSchema).transform((items) => ({ items })),
        z.object({
            items: z.array(externalItemSchema),
            followOn: followOnSchema,
        }),
    ]),
);

const externalItemSchema: z.ZodType<ExternalItem> = z.lazy(() =>
    z.discriminatedUnion("type", [
        z.object({
            type: z.literal("action"),
            ...baseAction,
            limitation: z.boolean().optional(),
            defer: z.string().optional(),
            followOn: followOnSchema,
            ...baseSensed,
            timer: z.number().int().positive().optional(),
            comment: z.string().optional(),
        }),
        // Legacy "sensed" type — accepted on import, converted to "action".
        z.object({
            type: z.literal("sensed"),
            ...baseAction,
            ...baseSensed,
        }),
        z.object({
            type: z.literal("conditional"),
            challenge: z.string(),
            paths: z.object({
                YES: externalPathSchema,
                NO: externalPathSchema,
            }),
        }),
        z.object({
            type: z.literal("multi-select"),
            challenge: z.string(),
            paths: z.record(z.string(), externalPathSchema),
        }),
        z.object({
            type: z.literal("free-text"),
            text: z.string(),
            defer: z.string().optional(),
            followOn: followOnSchema,
        }),
        z.object({ type: z.literal("form-feed") }),
        z.object({
            type: z.literal("note"),
            text: z.string(),
            level: z.enum(["note", "caution", "warning"]),
            defer: z.string().optional(),
            followOn: followOnSchema,
        }),
    ]),
);

export type ExternalPath = { items: ExternalItem[]; followOn?: string[] };

export type ExternalItem =
    | {
          type: "action";
          challenge: string;
          response?: string;
          limitation?: boolean;
          defer?: string;
          followOn?: string[];
          sensed?: number | string;
          inverted?: boolean;
          latchable?: boolean;
          timer?: number;
          comment?: string;
      }
    | {
          type: "sensed";
          challenge: string;
          response?: string;
          sensed?: number | string;
          inverted?: boolean;
          latchable?: boolean;
      }
    | { type: "conditional"; challenge: string; paths: { YES: ExternalPath; NO: ExternalPath } }
    | { type: "multi-select"; challenge: string; paths: Record<string, ExternalPath> }
    | { type: "free-text"; text: string; defer?: string; followOn?: string[] }
    | { type: "form-feed" }
    | { type: "note"; text: string; level: "note" | "caution" | "warning"; defer?: string; followOn?: string[] };

/** A checklist, on disk — no `category`, since that's contextual (which array or
 *  section it lives in within a package, or wherever the user places it on
 *  import/drag for a standalone file) rather than an inherent property to save. */
const checklistExportSchema = z.object({
    name: z.string(),
    phase: phaseSchema.optional(),
    cas: casMessageSchema.optional(),
    items: z.array(externalItemSchema),
});

export type ChecklistExport = z.infer<typeof checklistExportSchema>;

/* ── package (whole database) contract ─────────────────────────── */

const packageSectionExportSchema = z.object({
    name: z.string(),
    checklists: z.array(checklistExportSchema),
});

export type PackageSectionExport = z.infer<typeof packageSectionExportSchema>;

// A category entry: either a bare checklist (has `items`) or a named section
// (has `checklists`) — the two shapes are already structurally distinct, so no
// extra discriminant field is needed to tell them apart.
const categoryEntryExportSchema = z.union([checklistExportSchema, packageSectionExportSchema]);

export type CategoryEntryExport = z.infer<typeof categoryEntryExportSchema>;

function isSectionExport(e: CategoryEntryExport): e is PackageSectionExport {
    return "checklists" in e;
}

export const packageExportSchema = z.object({
    name: z.string(),
    partNumber: z.string().optional(),
    version: z.number().int().optional(),
    normal: z.array(categoryEntryExportSchema),
    non_normal: z.array(categoryEntryExportSchema),
    procedure: z.array(categoryEntryExportSchema),
});

export type PackageExport = z.infer<typeof packageExportSchema>;

/* ── internal <-> external conversion ──────────────────────────── */

function stripFollowOn(followOn: string[] | undefined, nameOf: (id: string) => string | undefined): string[] | undefined {
    return followOn?.map((id) => nameOf(id) ?? id);
}

function stripPath(path: ItemPath, nameOf: (id: string) => string | undefined): ExternalPath {
    return {
        items: path.items.map((x) => stripItem(x, nameOf)),
        followOn: stripFollowOn(path.followOn, nameOf),
    };
}

function stripItem(it: ChecklistItem, nameOf: (id: string) => string | undefined): ExternalItem {
    switch (it.type) {
        case "action":
            return {
                type: "action",
                challenge: it.challenge,
                response: it.response,
                limitation: it.limitation ? true : undefined,
                defer: it.defer ? (nameOf(it.defer) ?? it.defer) : undefined,
                followOn: stripFollowOn(it.followOn, nameOf),
                sensed: it.sensed !== undefined ? (varName(it.sensed) ?? it.sensed) : undefined,
                inverted: it.inverted ? true : undefined,
                latchable: it.latchable ? true : undefined,
                timer: it.timer,
                comment: it.comment,
            };
        case "conditional":
            return {
                type: "conditional",
                challenge: it.challenge,
                paths: {
                    YES: stripPath(it.paths.YES, nameOf),
                    NO: stripPath(it.paths.NO, nameOf),
                },
            };
        case "multi-select":
            return {
                type: "multi-select",
                challenge: it.challenge,
                paths: Object.fromEntries(Object.entries(it.paths).map(([k, v]) => [k, stripPath(v, nameOf)])),
            };
        case "free-text":
            return {
                type: "free-text",
                text: it.text,
                defer: it.defer ? (nameOf(it.defer) ?? it.defer) : undefined,
                followOn: stripFollowOn(it.followOn, nameOf),
            };
        case "form-feed":
            return { type: "form-feed" };
        case "note":
            return {
                type: "note",
                text: it.text,
                level: it.level,
                defer: it.defer ? (nameOf(it.defer) ?? it.defer) : undefined,
                followOn: stripFollowOn(it.followOn, nameOf),
            };
    }
}

function hydrateFollowOn(followOn: string[] | undefined, idOf: (name: string) => string | undefined): string[] | undefined {
    return followOn?.map((name) => idOf(name) ?? name);
}

function hydratePath(path: ExternalPath, idOf: (name: string) => string | undefined): ItemPath {
    return {
        items: path.items.map((x) => hydrateItem(x, idOf)),
        followOn: hydrateFollowOn(path.followOn, idOf),
    };
}

function hydrateItem(it: ExternalItem, idOf: (name: string) => string | undefined): ChecklistItem {
    switch (it.type) {
        case "action":
            return {
                type: "action",
                id: uid("i"),
                challenge: it.challenge,
                response: it.response,
                limitation: it.limitation,
                defer: it.defer ? (idOf(it.defer) ?? it.defer) : undefined,
                followOn: hydrateFollowOn(it.followOn, idOf),
                sensed:
                    typeof it.sensed === "number"
                        ? it.sensed
                        : it.sensed !== undefined
                          ? varIndex(it.sensed)
                          : undefined,
                inverted: it.inverted,
                latchable: it.latchable,
                timer: it.timer,
                comment: it.comment,
            };
        case "sensed":
            return {
                type: "action",
                id: uid("i"),
                challenge: it.challenge,
                response: it.response,
                sensed:
                    typeof it.sensed === "number"
                        ? it.sensed
                        : it.sensed !== undefined
                          ? varIndex(it.sensed)
                          : undefined,
                inverted: it.inverted,
                latchable: it.latchable,
            };
        case "conditional":
            return {
                type: "conditional",
                id: uid("i"),
                challenge: it.challenge,
                paths: {
                    YES: hydratePath(it.paths.YES, idOf),
                    NO: hydratePath(it.paths.NO, idOf),
                },
            };
        case "multi-select":
            return {
                type: "multi-select",
                id: uid("i"),
                challenge: it.challenge,
                paths: Object.fromEntries(Object.entries(it.paths).map(([k, v]) => [k, hydratePath(v, idOf)])),
            };
        case "free-text":
            return {
                type: "free-text",
                id: uid("i"),
                text: it.text,
                defer: it.defer ? (idOf(it.defer) ?? it.defer) : undefined,
                followOn: hydrateFollowOn(it.followOn, idOf),
            };
        case "form-feed":
            return { type: "form-feed", id: uid("i") };
        case "note":
            return {
                type: "note",
                id: uid("i"),
                text: it.text,
                level: it.level,
                defer: it.defer ? (idOf(it.defer) ?? it.defer) : undefined,
                followOn: hydrateFollowOn(it.followOn, idOf),
            };
    }
}

/** Flattens a category's interleaved (checklist | section) entries down to
 *  just the checklists, in order. */
function flattenEntries(entries: CategoryEntry[]): Checklist[] {
    const out: Checklist[] = [];
    for (const e of entries) {
        if (e.kind === "checklist") out.push(e);
        else out.push(...e.checklists);
    }
    return out;
}

/** Builds an id -> checklist-name lookup covering every checklist in a database,
 *  used to export `defer`/`followOn` action references by name (portable)
 *  instead of by internal editor id. */
export function nameResolverFor(db: ChecklistDatabase): (id: string) => string | undefined {
    const map = new Map<string, string>();
    for (const cl of [
        ...flattenEntries(db.categories.normal),
        ...flattenEntries(db.categories.non_normal),
        ...flattenEntries(db.categories.procedure),
    ]) {
        map.set(cl.id, cl.name);
    }
    return (id) => map.get(id);
}

export function toExport(cl: Checklist, nameOf: (id: string) => string | undefined): ChecklistExport {
    return {
        name: cl.name,
        phase: cl.phase,
        cas: cl.cas !== undefined ? (casMessageName(cl.cas) ?? cl.cas) : undefined,
        items: cl.items.map((it) => stripItem(it, nameOf)),
    };
}

export function serializeChecklist(cl: Checklist, nameOf: (id: string) => string | undefined): string {
    return JSON.stringify(toExport(cl, nameOf), null, "\t");
}

function hydrateChecklistWithId(
    data: ChecklistExport,
    id: string,
    idOf: (name: string) => string | undefined,
): Checklist {
    return {
        kind: "checklist",
        id,
        name: data.name,
        items: data.items.map((it) => hydrateItem(it, idOf)),
        cas: typeof data.cas === "number" ? data.cas : data.cas !== undefined ? casMessageIndex(data.cas) : undefined,
        phase: data.phase,
    };
}

/** Hydrates a single checklist with no cross-checklist context, so any
 *  `defer`/`followOn` references can't be resolved (left unset). */
function hydrateChecklistCore(data: ChecklistExport): Checklist {
    return hydrateChecklistWithId(data, uid("cl"), () => undefined);
}

export type ParseResult = { ok: true; checklist: Checklist; category: Category } | { ok: false; error: string };

/** `category` isn't part of the on-disk contract (it's contextual), so the
 *  caller decides where an imported checklist lands; defaults to "normal". */
export function parseChecklist(json: string, category: Category = "normal"): ParseResult {
    let raw: unknown;
    try {
        raw = JSON.parse(json);
    } catch (e) {
        return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
    }
    const result = checklistExportSchema.safeParse(raw);
    if (!result.success) {
        return { ok: false, error: z.prettifyError(result.error) };
    }
    return {
        ok: true,
        checklist: hydrateChecklistCore(result.data),
        category,
    };
}

/* ── package (whole database) conversion ───────────────────────── */

function toEntryExport(entry: CategoryEntry, nameOf: (id: string) => string | undefined): CategoryEntryExport {
    if (entry.kind === "checklist") return toExport(entry, nameOf);
    return { name: entry.name, checklists: entry.checklists.map((cl) => toExport(cl, nameOf)) };
}

export function toPackageExport(db: ChecklistDatabase): PackageExport {
    const nameOf = nameResolverFor(db);
    return {
        name: db.name,
        partNumber: db.partNumber,
        version: CURRENT_SCHEMA_VERSION,
        normal: db.categories.normal.map((e) => toEntryExport(e, nameOf)),
        non_normal: db.categories.non_normal.map((e) => toEntryExport(e, nameOf)),
        procedure: db.categories.procedure.map((e) => toEntryExport(e, nameOf)),
    };
}

export function serializePackage(db: ChecklistDatabase): string {
    return JSON.stringify(toPackageExport(db), null, "\t");
}

export type PackageParseResult = { ok: true; database: ChecklistDatabase } | { ok: false; error: string };

export function parsePackage(json: string): PackageParseResult {
    let raw: unknown;
    try {
        raw = JSON.parse(json);
    } catch (e) {
        return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
    }
    const result = packageExportSchema.safeParse(raw);
    if (!result.success) {
        return { ok: false, error: z.prettifyError(result.error) };
    }
    const data = result.data;

    // Two-pass hydration: assign every checklist an id (and index it by name)
    // up front, so defer/followOn references anywhere in the package resolve
    // regardless of declaration order.
    const flattenExportEntries = (entries: CategoryEntryExport[]): ChecklistExport[] =>
        entries.flatMap((e) => (isSectionExport(e) ? e.checklists : [e]));
    const allExports = [
        ...flattenExportEntries(data.normal),
        ...flattenExportEntries(data.non_normal),
        ...flattenExportEntries(data.procedure),
    ];
    const idByExport = new Map<ChecklistExport, string>();
    const idByName = new Map<string, string>();
    for (const exp of allExports) {
        const id = uid("cl");
        idByExport.set(exp, id);
        idByName.set(exp.name, id);
    }
    const idOf = (name: string) => idByName.get(name);
    // Every export in allExports was assigned an id above, so this lookup always hits.
    const hydrate = (exp: ChecklistExport): Checklist =>
        hydrateChecklistWithId(exp, idByExport.get(exp) ?? uid("cl"), idOf);
    const hydrateEntry = (e: CategoryEntryExport): CategoryEntry =>
        isSectionExport(e)
            ? { kind: "section", id: uid("sec"), name: e.name, checklists: e.checklists.map(hydrate) }
            : hydrate(e);

    return {
        ok: true,
        database: {
            id: uid("db"),
            name: data.name,
            partNumber: data.partNumber,
            categories: {
                normal: data.normal.map(hydrateEntry),
                non_normal: data.non_normal.map(hydrateEntry),
                procedure: data.procedure.map(hydrateEntry),
            },
        },
    };
}
