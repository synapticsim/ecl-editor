import { useState } from "react";
import "./Preview.css";

import { Icon } from "../../icons";
import { nameResolverFor, serializeChecklist } from "../../schemas";
import { useSelectedChecklist } from "../../state";
import { JsonView } from "./JsonView";

export function Preview() {
    const { checklist, db } = useSelectedChecklist();
    const [tab, setTab] = useState<"json" | "preview">("json");

    if (!checklist || !db) {
        return (
            <aside className="panel panel-r">
                <div className="r-tabs">
                    <button className="r-tab active">
                        <span className="glyph">{"{ }"}</span>
                        <span>JSON</span>
                    </button>
                </div>
            </aside>
        );
    }

    const json = serializeChecklist(checklist, nameResolverFor(db));

    function copy() {
        navigator.clipboard?.writeText(json);
    }
    function download() {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${checklist!.name.replace(/\s+/g, "_").toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <aside className="panel panel-r">
            <div className="r-tabs">
                <button className={`r-tab${tab === "json" ? " active" : ""}`} onClick={() => setTab("json")}>
                    <span className="glyph">{"{ }"}</span>
                    <span>JSON</span>
                </button>
                <button className="r-tab disabled" title="Live cockpit preview — port from your existing renderer">
                    <span className="glyph">▶</span>
                    <span>Preview</span>
                </button>
                <div className="r-actions">
                    <button className="icon" title="Copy JSON" onClick={copy}>
                        <Icon name="copy" />
                    </button>
                    <button className="icon" title="Download" onClick={download}>
                        <Icon name="download" />
                    </button>
                </div>
            </div>

            <div className="r-body">
                <JsonView json={json} />
            </div>
        </aside>
    );
}
