import type { CasMessage } from "./lib/cas";

export interface ActionItem {
    type: "action";
    id: string;
    challenge: string;
    response?: string;
    extension?: string;
}

export interface SensedItem {
    type: "sensed";
    id: string;
    challenge: string;
    response?: string;
    sensed: string;
    inverted?: boolean;
    latchable?: boolean;
}

export interface ConditionalItem {
    type: "conditional";
    id: string;
    challenge: string;
    paths: {
        YES: ChecklistItem[];
        NO: ChecklistItem[];
    };
}

export interface MultiSelectItem {
    type: "multi-select";
    id: string;
    challenge: string;
    paths: { [response: string]: ChecklistItem[] };
}

export interface FreeTextItem {
    type: "free-text";
    id: string;
    text: string;
}

export interface FormFeedItem {
    type: "form-feed";
    id: string;
}

export type ChecklistItem = ActionItem | SensedItem | ConditionalItem | MultiSelectItem | FreeTextItem | FormFeedItem;

export type ItemType = ChecklistItem["type"];

export type Category = "normal" | "non-normal" | "procedure";

export interface SectionHeader {
    kind: "header";
    id: string;
    name: string;
}

export interface Checklist {
    kind?: "checklist";
    id: string;
    name: string;
    category: Category;
    items: ChecklistItem[];
    cas?: CasMessage;
}

export type CategoryEntry = Checklist | SectionHeader;

export interface ChecklistDatabase {
    id: string;
    name: string;
    categories: Record<Category, CategoryEntry[]>;
}

export function isHeader(entry: CategoryEntry): entry is SectionHeader {
    return (entry as SectionHeader).kind === "header";
}

export const CATEGORY_LABELS: Record<Category, string> = {
    normal: "Normal",
    "non-normal": "Non-Normal",
    procedure: "Procedure",
};
