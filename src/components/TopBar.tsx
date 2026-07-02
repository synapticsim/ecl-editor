import "./TopBar.css";

import { CATEGORY_LABELS, isHeader } from "../checklist";
import { Icon } from "../icons";
import { serializeChecklist } from "../schemas";
import { useSaveStatus, useSelectedChecklist } from "../state";

function sectionFor(db: ReturnType<typeof useSelectedChecklist>["db"], checklistId: string): string | null {
    if (!db) return null;
    for (const cat of Object.values(db.categories)) {
        let section: string | null = null;
        for (const entry of cat) {
            if (isHeader(entry)) {
                section = entry.name;
            } else if (entry.id === checklistId) {
                return section;
            }
        }
    }
    return null;
}

export function TopBar() {
    const { checklist, db } = useSelectedChecklist();
    const status = useSaveStatus();

    const section = checklist ? sectionFor(db, checklist.id) : null;

    function handleExport() {
        if (!checklist) return;
        const blob = new Blob([serializeChecklist(checklist)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${checklist.name.replace(/\s+/g, "_").toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <header className="topbar">
            <div className="brand">
                <span className="brand-dot" />
                <span>Synaptic</span>
                <span style={{ color: "var(--fg-4)", fontWeight: 400, marginLeft: 4 }}>checklist editor</span>
            </div>
            <span className="sep" />
            <span className="file mono">
                <span>{db ? db.name : "—"}</span>
                {checklist && (
                    <>
                        <span className="slash">/</span>
                        <span>{CATEGORY_LABELS[checklist.category]}</span>
                        {section && (
                            <>
                                <span className="slash">/</span>
                                <span>{section}</span>
                            </>
                        )}
                        <span className="slash">/</span>
                        <span className="current">{checklist.name}</span>
                    </>
                )}
            </span>
            <span className={`pill ${status}`}>
                <span className="pill-dot" />
                {status === "saving" ? "saving changes" : "changes automatically saved"}
            </span>
            <div className="spacer" />
            <button className="btn-export" onClick={handleExport} disabled={!checklist}>
                <Icon name="download" size={11} />
                Export
            </button>
        </header>
    );
}
