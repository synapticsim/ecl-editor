import type { ChecklistItem } from "./checklist";

export function findItem(items: ChecklistItem[], id: string): ChecklistItem | null {
    for (const it of items) {
        if (it.id === id) return it;
        if (it.type === "conditional") {
            const found = findItem(it.paths.YES, id) ?? findItem(it.paths.NO, id);
            if (found) return found;
        } else if (it.type === "multi-select") {
            for (const list of Object.values(it.paths)) {
                const found = findItem(list, id);
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
            n += countItems(it.paths.YES) + countItems(it.paths.NO);
        } else if (it.type === "multi-select") {
            for (const list of Object.values(it.paths)) n += countItems(list);
        }
    }
    return n;
}

export function maxDepth(items: ChecklistItem[], depth = 1): number {
    let max = items.length ? depth : 0;
    for (const it of items) {
        if (it.type === "conditional") {
            max = Math.max(max, maxDepth(it.paths.YES, depth + 1), maxDepth(it.paths.NO, depth + 1));
        } else if (it.type === "multi-select") {
            for (const list of Object.values(it.paths)) {
                max = Math.max(max, maxDepth(list, depth + 1));
            }
        }
    }
    return max;
}

export const ITEM_TYPE_META: Record<ChecklistItem["type"], { label: string; cssVar: string; toolbar: string }> = {
    action: { label: "ACTION", cssVar: "var(--t-action)", toolbar: "Action" },
    sensed: { label: "SENSED", cssVar: "var(--t-sensed)", toolbar: "Sensed" },
    conditional: { label: "IF", cssVar: "var(--t-conditional)", toolbar: "Conditional" },
    "multi-select": { label: "MULTI", cssVar: "var(--t-multiselect)", toolbar: "Multi-select" },
    "free-text": { label: "NOTE", cssVar: "var(--t-freetext)", toolbar: "Text" },
    "form-feed": { label: "PAGE BREAK", cssVar: "var(--t-formfeed)", toolbar: "Page break" },
};
