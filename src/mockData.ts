import type { ChecklistDatabase } from "./checklist";

export function seedDatabases(): ChecklistDatabase[] {
    return [
        {
            id: "db-1",
            name: "Untitled Database",
            version: "v1.0.0",
            categories: { normal: [], "non-normal": [], procedure: [] },
        },
    ];
}
