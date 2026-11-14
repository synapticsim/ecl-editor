import type { ChecklistItem } from "./checklist";

export function findItem(items: ChecklistItem[], id: string): ChecklistItem | null {
    for (const it of items) {
        if (it.id === id) return it;
        if (it.type === "conditional") {
            const found = findItem(it.paths.YES.items, id) ?? findItem(it.paths.NO.items, id);
            if (found) return found;
        } else if (it.type === "multi-select") {
            for (const path of Object.values(it.paths)) {
                const found = findItem(path.items, id);
                if (found) return found;
            }
        }
    }
    return null;
}

export function countItems(items: ChecklistItem[]): number {
    let n = 0;
    for (const it of items) {
        n += 1;
        if (it.type === "conditional") {
            n += countItems(it.paths.YES.items) + countItems(it.paths.NO.items);
        } else if (it.type === "multi-select") {
            for (const path of Object.values(it.paths)) n += countItems(path.items);
        }
    }
    return n;
}

export const ITEM_TYPE_META: Record<ChecklistItem["type"], { label: string; cssVar: string; toolbar: string }> = {
    action: { label: "ACTION", cssVar: "var(--t-action)", toolbar: "Action" },
    conditional: { label: "IF", cssVar: "var(--t-conditional)", toolbar: "Conditional" },
    "multi-select": { label: "MULTI", cssVar: "var(--t-multiselect)", toolbar: "Multi-select" },
    "free-text": { label: "TEXT", cssVar: "var(--t-freetext)", toolbar: "Text" },
    "form-feed": { label: "PAGE BREAK", cssVar: "var(--t-formfeed)", toolbar: "Page break" },
    note: { label: "NOTE", cssVar: "var(--t-note)", toolbar: "Note" },
};
