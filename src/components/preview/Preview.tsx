import { useState } from "react";
import "./Preview.css";
import { useSelectedChecklist } from "../../state";
import { serializeChecklist } from "../../schemas";
import { Icon } from "../../icons";
import { JsonView } from "./JsonView";

export function Preview() {
    const { checklist } = useSelectedChecklist();
    const [tab, setTab] = useState<"json" | "preview">("json");

    if (!checklist) {
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

    const json = serializeChecklist(checklist);

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
                    <span style={{ marginLeft: 6, fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--fg-4)", textTransform: "uppercase" }}>
                        port
                    </span>
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
