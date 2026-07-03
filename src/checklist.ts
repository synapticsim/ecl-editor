import type { CasMessage } from "./lib/cas";

export interface ActionItem {
    type: "action";
    id: string;
    challenge: string;
    response?: string;
    extension?: string;
    /** Flags this action as a limitation. */
    limitation?: boolean;
    /** Id of another checklist this item defers to. */
    defer?: string;
    /** Id of another checklist to follow on to after this item. */
    followOn?: string;
}

export interface SensedItem {
    type: "sensed";
    id: string;
    challenge: string;
    response?: string;
    /** Numeric ECL_VARIABLE index (see lib/vars.ts), not the variable name. */
    sensed?: number;
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

export type Category = "normal" | "non_normal" | "procedure";

export type Phase = "pre-flight" | "in-flight" | "post-flight";

export interface Checklist {
    kind?: "checklist";
    id: string;
    name: string;
    items: ChecklistItem[];
    /** Non-normal only. */
    cas?: CasMessage;
    /** Normal only. */
    phase?: Phase;
}

/** A named group of checklists shown together in the sidebar (non_normal, by system; procedure, by phase/task). */
export interface Section {
    kind: "section";
    id: string;
    name: string;
    checklists: Checklist[];
}

export interface ChecklistDatabase {
    id: string;
    name: string;
    categories: {
        normal: Checklist[];
        non_normal: Section[];
        procedure: Section[];
    };
}

export const CATEGORY_LABELS: Record<Category, string> = {
    normal: "Normal",
    non_normal: "Non-Normal",
    procedure: "Procedure",
};

export const PHASE_LABELS: Record<Phase, string> = {
    "pre-flight": "Pre-Flight",
    "in-flight": "In-Flight",
    "post-flight": "Post-Flight",
};
