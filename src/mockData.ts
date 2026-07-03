import type { ChecklistDatabase } from "./checklist";

export function seedDatabases(): ChecklistDatabase[] {
    return [
        {
            id: "db-1",
            name: "Untitled Database",
            categories: { normal: [], non_normal: [], procedure: [] },
        },
    ];
}
