import { useEffect, useRef, useState } from "react";
import "./TopBar.css";

import { CATEGORY_LABELS } from "../checklist";
import { Icon } from "../icons";
import { toMsfsXml } from "../msfsExport";
import { nameResolverFor, serializeChecklist, serializePackage } from "../schemas";
import { useSaveStatus, useSelectedChecklist } from "../state";
import { useConfirm } from "./common/confirmContext";

function downloadBlob(text: string, filename: string, mime = "application/json") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function TopBar() {
    const { checklist, db, category, section } = useSelectedChecklist();
    const status = useSaveStatus();
    const confirm = useConfirm();
    const [exportOpen, setExportOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!exportOpen) return;
        function onDown(e: PointerEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setExportOpen(false);
        }
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [exportOpen]);

    function handleExportPackage() {
        if (!db) return;
        downloadBlob(serializePackage(db), `${db.name.replace(/\s+/g, "_").toLowerCase()}.json`);
    }

    function handleExportChecklist() {
        if (!checklist || !db) return;
        downloadBlob(
            serializeChecklist(checklist, nameResolverFor(db)),
            `${checklist.name.replace(/\s+/g, "_").toLowerCase()}.json`,
        );
    }

    async function handleExportMsfs() {
        if (!db) return;
        const { xml, warnings } = toMsfsXml(db);
        if (warnings.length > 0) {
            const ok = await confirm({
                title: "Export MSFS XML",
                message: (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {warnings.map((w, i) => (
                            <li key={i}>
                                {w.checklist && <strong>{w.checklist}: </strong>}
                                {w.message}
                                {w.item && <span style={{ color: "var(--fg-4)" }}> ({w.item})</span>}
                            </li>
                        ))}
                    </ul>
                ),
                confirmLabel: "Download",
                tone: "normal",
            });
            if (!ok) return;
        }
        downloadBlob(xml, "Checklist.xml", "text/xml");
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
                {checklist && category && (
                    <>
                        <span className="slash">/</span>
                        <span>{CATEGORY_LABELS[category]}</span>
                        {section && (
                            <>
                                <span className="slash">/</span>
                                <span>{section.name}</span>
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
            <div className={`export-ctl${exportOpen ? " open" : ""}`} ref={exportMenuRef}>
                <button className="btn-export" onClick={() => setExportOpen((o) => !o)} disabled={!db}>
                    <Icon name="download" size={11} />
                    Export
                </button>
                {exportOpen && (
                    <div className="export-menu mono">
                        <button
                            onClick={() => {
                                setExportOpen(false);
                                handleExportPackage();
                            }}
                        >
                            Export package…
                        </button>
                        <button
                            disabled={!checklist}
                            onClick={() => {
                                setExportOpen(false);
                                handleExportChecklist();
                            }}
                        >
                            Export checklist…
                        </button>
                        <button
                            onClick={() => {
                                setExportOpen(false);
                                handleExportMsfs();
                            }}
                        >
                            Export MSFS XML…
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
