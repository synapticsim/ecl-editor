import { useRef, useState } from "react";
import "./Sidebar.css";

import { Icon } from "../../icons";
import { parseChecklist } from "../../schemas";
import { useAppState, useDispatch } from "../../state";
import { DatabaseNode } from "./DatabaseNode";

export function Sidebar() {
    const { databases, selectedChecklistId } = useAppState();
    const dispatch = useDispatch();
    const [query, setQuery] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        const dbId = databases[0]?.id;
        if (!file || !dbId) return;
        file.text().then((text) => {
            const result = parseChecklist(text);
            if (!result.ok) {
                alert(`Import failed:\n\n${result.error}`);
                return;
            }
            dispatch({
                type: "import-checklist",
                dbId,
                category: result.checklist.category,
                checklist: result.checklist,
            });
        });
    }

    return (
        <aside className="panel panel-l">
            <div className="l-search">
                <Icon name="search" size={11} />
                <input placeholder="Search checklists…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="l-body">
                {databases.map((db, i) => (
                    <DatabaseNode
                        key={db.id}
                        db={db}
                        defaultOpen={i === 0}
                        selectedId={selectedChecklistId}
                        query={query}
                        onSelect={(id) => dispatch({ type: "select", id })}
                    />
                ))}
            </div>

            <div className="l-foot">
                <button onClick={() => dispatch({ type: "add-checklist", dbId: databases[0].id, category: "normal" })}>
                    <span className="plus">+</span> Checklist
                </button>
                <button onClick={() => fileRef.current?.click()}>
                    <Icon name="upload" size={11} /> Import
                </button>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={handleImportFile}
            />
        </aside>
    );
}
