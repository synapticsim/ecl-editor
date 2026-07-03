import { useEffect, useRef, useState } from "react";
import "./Sidebar.css";

import { Icon } from "../../icons";
import { parseChecklist, parsePackage } from "../../schemas";
import { useAppState, useDispatch } from "../../state";
import { DatabaseNode } from "./DatabaseNode";

export function Sidebar() {
    const { databases, selectedChecklistId } = useAppState();
    const dispatch = useDispatch();
    const [query, setQuery] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    const packageFileRef = useRef<HTMLInputElement>(null);
    const checklistFileRef = useRef<HTMLInputElement>(null);
    const importMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!importOpen) return;
        function onDown(e: PointerEvent) {
            if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setImportOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setImportOpen(false);
        }
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [importOpen]);

    function handleImportPackageFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        file.text().then((text) => {
            const result = parsePackage(text);
            if (!result.ok) {
                alert(`Import failed:\n\n${result.error}`);
                return;
            }
            dispatch({ type: "import-database", database: result.database });
        });
    }

    function handleImportChecklistFile(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        const dbId = databases[0]?.id;
        if (files.length === 0 || !dbId) return;
        Promise.all(files.map((file) => file.text().then((text) => ({ file, text })))).then((entries) => {
            const errors: string[] = [];
            for (const { file, text } of entries) {
                const result = parseChecklist(text);
                if (!result.ok) {
                    errors.push(`${file.name}: ${result.error}`);
                    continue;
                }
                dispatch({
                    type: "import-checklist",
                    dbId,
                    category: result.category,
                    checklist: result.checklist,
                });
            }
            if (errors.length > 0) {
                alert(`Some checklists failed to import:\n\n${errors.join("\n\n")}`);
            }
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
                <button
                    onClick={() => {
                        const dbId = databases[0]?.id;
                        if (dbId) dispatch({ type: "add-checklist", dbId, category: "normal" });
                    }}
                    disabled={databases.length === 0}
                >
                    <span className="plus">+</span> Checklist
                </button>
                <div className={`import-ctl${importOpen ? " open" : ""}`} ref={importMenuRef}>
                    <button onClick={() => setImportOpen((o) => !o)}>
                        <Icon name="upload" size={11} /> Import
                    </button>
                    {importOpen && (
                        <div className="import-menu mono">
                            <button
                                onClick={() => {
                                    setImportOpen(false);
                                    packageFileRef.current?.click();
                                }}
                            >
                                Import package…
                            </button>
                            <button
                                disabled={databases.length === 0}
                                onClick={() => {
                                    setImportOpen(false);
                                    checklistFileRef.current?.click();
                                }}
                            >
                                Import checklist…
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <input
                ref={packageFileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={handleImportPackageFile}
            />
            <input
                ref={checklistFileRef}
                type="file"
                accept="application/json,.json"
                multiple
                style={{ display: "none" }}
                onChange={handleImportChecklistFile}
            />
        </aside>
    );
}
