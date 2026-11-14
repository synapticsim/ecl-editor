import { useDroppable } from "@dnd-kit/core";
import { createContext, useContext } from "react";

import type { Category, CategoryEntry, ChecklistDatabase } from "../../checklist";

/* Sidebar tree drag-and-drop.
 *
 * Nothing moves while dragging: the pointer's position over a drop zone is
 * resolved into a `DropIntent` (an insertion slot), which the tree renders as
 * a line — plus a highlight on the section being dropped into. The move is
 * only dispatched on drop. */

/** What a droppable row represents; attached as dnd-kit droppable `data`. */
export type DropZone =
    | { kind: "leaf"; category: Category; sectionId?: string; id: string }
    | { kind: "section"; category: Category; id: string }
    | { kind: "cat-start"; category: Category }
    | { kind: "cat-end"; category: Category };

/** An insertion slot: before `beforeId` (or at the end, when null) in the top
 *  level of `category`, or in section `sectionId` when given. */
export interface DropIntent {
    category: Category;
    sectionId?: string;
    beforeId: string | null;
}

export const CATEGORIES = ["normal", "non_normal", "procedure"] as const;

export const zoneId = (zone: DropZone): string =>
    zone.kind === "leaf" || zone.kind === "section"
        ? `drop:${zone.kind}:${zone.id}`
        : `drop:${zone.kind}:${zone.category}`;

/** DOM attribute holding a zone's id, used to read its live rect. */
export const ZONE_ATTR = "data-drop-zone";
/** DOM attribute on a section's whole block (header + checklists). */
export const SECTION_BLOCK_ATTR = "data-section-block";

/** Registers a droppable row for `zone`, tagged so its live rect can be read. */
export function useDropZone(zone: DropZone) {
    const id = zoneId(zone);
    const { setNodeRef } = useDroppable({ id, data: { zone } });
    return { setNodeRef, zoneProps: { [ZONE_ATTR]: id } };
}

interface TreeDnd {
    intent: DropIntent | null;
    dragDisabled: boolean;
}

export const TreeDndContext = createContext<TreeDnd>({ intent: null, dragDisabled: false });
export const useTreeDnd = () => useContext(TreeDndContext);

/** Whether `intent` is the slot directly before `beforeId` in the given container. */
export function isSlot(
    intent: DropIntent | null,
    category: Category,
    sectionId: string | undefined,
    beforeId: string | null,
): boolean {
    return !!intent && intent.category === category && intent.sectionId === sectionId && intent.beforeId === beforeId;
}

export function DropLine({ inSection }: { inSection?: boolean }) {
    return (
        <div className="tree-drop-slot">
            <div className={`tree-drop-line${inSection ? " in-section" : ""}`} />
        </div>
    );
}

/* ── intent resolution ─────────────────────────────────────────── */

function nextId(ids: string[], id: string): string | null {
    const i = ids.indexOf(id);
    return i >= 0 && i + 1 < ids.length ? ids[i + 1] : null;
}

function findSectionEntry(entries: CategoryEntry[], id: string) {
    return entries.find((e) => e.kind === "section" && e.id === id);
}

/** Where the dragged entry currently sits, as a slot — used to drop no-op intents. */
function currentSlots(db: ChecklistDatabase, activeId: string): DropIntent[] {
    for (const category of CATEGORIES) {
        const entries = db.categories[category];
        const topIds = entries.map((e) => e.id);
        if (topIds.includes(activeId)) {
            return [
                { category, beforeId: activeId },
                { category, beforeId: nextId(topIds, activeId) },
            ];
        }
        for (const e of entries) {
            if (e.kind !== "section") continue;
            const ids = e.checklists.map((cl) => cl.id);
            if (ids.includes(activeId)) {
                return [
                    { category, sectionId: e.id, beforeId: activeId },
                    { category, sectionId: e.id, beforeId: nextId(ids, activeId) },
                ];
            }
        }
    }
    return [];
}

function rectOf(selector: string): DOMRect | null {
    return document.querySelector(selector)?.getBoundingClientRect() ?? null;
}

/** Resolves the pointer's position over `zone` into an insertion slot, or null
 *  when there's nothing to do (including dropping an entry back where it is). */
export function resolveIntent(
    db: ChecklistDatabase,
    activeId: string,
    activeIsSection: boolean,
    zone: DropZone,
    pointerY: number,
): DropIntent | null {
    const entries = db.categories[zone.category];
    const topIds = entries.map((e) => e.id);
    const { category } = zone;
    let intent: DropIntent;

    if (zone.kind === "cat-start") {
        intent = { category, beforeId: topIds[0] ?? null };
    } else if (zone.kind === "cat-end") {
        intent = { category, beforeId: null };
    } else if (activeIsSection) {
        // Sections only live at the top level: treat anything inside a section
        // as hovering that section's whole block.
        const entryId = zone.kind === "leaf" ? (zone.sectionId ?? zone.id) : zone.id;
        const rect =
            zone.kind === "leaf" && !zone.sectionId
                ? rectOf(`[${ZONE_ATTR}="${zoneId(zone)}"]`)
                : rectOf(`[${SECTION_BLOCK_ATTR}="${entryId}"]`);
        if (!rect) return null;
        const before = pointerY < rect.top + rect.height / 2;
        intent = { category, beforeId: before ? entryId : nextId(topIds, entryId) };
    } else {
        const rect = rectOf(`[${ZONE_ATTR}="${zoneId(zone)}"]`);
        if (!rect) return null;
        if (zone.kind === "section") {
            // Top sliver of a section header inserts above the section; the rest
            // drops into it, at the top.
            if (pointerY < rect.top + rect.height * 0.35) {
                intent = { category, beforeId: zone.id };
            } else {
                const section = findSectionEntry(entries, zone.id);
                const first = section?.kind === "section" ? (section.checklists[0]?.id ?? null) : null;
                intent = { category, sectionId: zone.id, beforeId: first };
            }
        } else {
            const section = zone.sectionId ? findSectionEntry(entries, zone.sectionId) : undefined;
            const siblings = section?.kind === "section" ? section.checklists.map((cl) => cl.id) : topIds;
            const before = pointerY < rect.top + rect.height / 2;
            intent = { category, sectionId: zone.sectionId, beforeId: before ? zone.id : nextId(siblings, zone.id) };
        }
    }

    const noop = currentSlots(db, activeId).some(
        (s) => s.category === intent.category && s.sectionId === intent.sectionId && s.beforeId === intent.beforeId,
    );
    return noop ? null : intent;
}
