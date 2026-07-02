import { z } from "zod";

import type { Category, Checklist, ChecklistItem } from "./checklist";
import { CasMessage } from "./lib/cas";

let counter = 0;
export function uid(prefix = "id"): string {
    counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/* ── External (on-disk / in-sim) item contract — no editor ids ── */

const baseAction = {
    challenge: z.string(),
    response: z.string().optional(),
    extension: z.string().optional(),
};

const casMessageSchema = z.enum(CasMessage);

const externalItemSchema: z.ZodType<ExternalItem> = z.lazy(() =>
    z.discriminatedUnion("type", [
        z.object({ type: z.literal("action"), ...baseAction }),
        z.object({
            type: z.literal("sensed"),
            ...baseAction,
            sensed: z.string(),
            inverted: z.boolean().optional(),
            latchable: z.boolean().optional(),
        }),
        z.object({
            type: z.literal("conditional"),
            challenge: z.string(),
            paths: z.object({
                YES: z.array(externalItemSchema),
                NO: z.array(externalItemSchema),
            }),
        }),
        z.object({
            type: z.literal("multi-select"),
            challenge: z.string(),
            paths: z.record(z.string(), z.array(externalItemSchema)),
        }),
        z.object({ type: z.literal("free-text"), text: z.string() }),
        z.object({ type: z.literal("form-feed") }),
    ]),
);

export const checklistExportSchema = z.object({
    name: z.string(),
    category: z.enum(["normal", "non-normal", "procedure"]),
    items: z.array(externalItemSchema),
    cas: casMessageSchema.optional(),
});

export type ExternalItem =
    | { type: "action"; challenge: string; response?: string; extension?: string }
    | {
          type: "sensed";
          challenge: string;
          response?: string;
          extension?: string;
          sensed: string;
          inverted?: boolean;
          latchable?: boolean;
      }
    | { type: "conditional"; challenge: string; paths: { YES: ExternalItem[]; NO: ExternalItem[] } }
    | { type: "multi-select"; challenge: string; paths: Record<string, ExternalItem[]> }
    | { type: "free-text"; text: string }
    | { type: "form-feed" };

export type ChecklistExport = z.infer<typeof checklistExportSchema>;

/* ── internal <-> external conversion ──────────────────────────── */

function stripItem(it: ChecklistItem): ExternalItem {
    switch (it.type) {
        case "action":
            return { type: "action", challenge: it.challenge, response: it.response, extension: it.extension };
        case "sensed":
            return {
                type: "sensed",
                challenge: it.challenge,
                response: it.response,
                sensed: it.sensed,
                inverted: it.inverted ? true : undefined,
                latchable: it.latchable ? true : undefined,
            };
        case "conditional":
            return {
                type: "conditional",
                challenge: it.challenge,
                paths: { YES: it.paths.YES.map(stripItem), NO: it.paths.NO.map(stripItem) },
            };
        case "multi-select":
            return {
                type: "multi-select",
                challenge: it.challenge,
                paths: Object.fromEntries(Object.entries(it.paths).map(([k, v]) => [k, v.map(stripItem)])),
            };
        case "free-text":
            return { type: "free-text", text: it.text };
        case "form-feed":
            return { type: "form-feed" };
    }
}

function hydrateItem(it: ExternalItem): ChecklistItem {
    switch (it.type) {
        case "action":
            return {
                type: "action",
                id: uid("i"),
                challenge: it.challenge,
                response: it.response,
                extension: it.extension,
            };
        case "sensed":
            return {
                type: "sensed",
                id: uid("i"),
                challenge: it.challenge,
                response: it.response,
                sensed: it.sensed,
                inverted: it.inverted,
                latchable: it.latchable,
            };
        case "conditional":
            return {
                type: "conditional",
                id: uid("i"),
                challenge: it.challenge,
                paths: { YES: it.paths.YES.map(hydrateItem), NO: it.paths.NO.map(hydrateItem) },
            };
        case "multi-select":
            return {
                type: "multi-select",
                id: uid("i"),
                challenge: it.challenge,
                paths: Object.fromEntries(Object.entries(it.paths).map(([k, v]) => [k, v.map(hydrateItem)])),
            };
        case "free-text":
            return { type: "free-text", id: uid("i"), text: it.text };
        case "form-feed":
            return { type: "form-feed", id: uid("i") };
    }
}

export function toExport(cl: Checklist): ChecklistExport {
    return {
        name: cl.name,
        category: cl.category,
        items: cl.items.map(stripItem),
        cas: cl.cas,
    };
}

export function serializeChecklist(cl: Checklist): string {
    return JSON.stringify(toExport(cl), null, 2);
}

export type ParseResult = { ok: true; checklist: Checklist } | { ok: false; error: string };

export function parseChecklist(json: string, category?: Category): ParseResult {
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
    const data = result.data;
    return {
        ok: true,
        checklist: {
            kind: "checklist",
            id: uid("cl"),
            name: data.name,
            category: category ?? data.category,
            items: data.items.map(hydrateItem),
            cas: data.cas,
        },
    };
}
