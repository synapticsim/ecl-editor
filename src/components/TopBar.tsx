import { useRef } from "react";
import "./TopBar.css";

import { CATEGORY_LABELS, isHeader } from "../checklist";
import { parseChecklist, serializeChecklist } from "../schemas";
import { useDispatch, useSaveStatus, useSelectedChecklist } from "../state";

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
    const dispatch = useDispatch();
    const status = useSaveStatus();
    const fileRef = useRef<HTMLInputElement>(null);

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

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !db) return;
        file.text().then((text) => {
            const result = parseChecklist(text);
            if (!result.ok) {
                alert(`Import failed:\n\n${result.error}`);
                return;
            }
            dispatch({
                type: "import-checklist",
                dbId: db.id,
                category: result.checklist.category,
                checklist: result.checklist,
            });
        });
    }

    function handleValidate() {
        if (!checklist) return;
        const result = parseChecklist(serializeChecklist(checklist));
        alert(result.ok ? "Checklist is valid against the schema." : `Validation error:\n\n${result.error}`);
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
            <div className="menu">
                <button onClick={handleValidate}>Validate</button>
                <button onClick={handleExport}>Export</button>
                <button onClick={() => fileRef.current?.click()}>Import</button>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={handleImportFile}
            />
        </header>
    );
}
