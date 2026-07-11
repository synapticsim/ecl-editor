import { useState } from "react";
import "./Preview.css";

import { nameResolverFor, serializeChecklist } from "../../schemas";
import { useSelectedChecklist } from "../../state";
import { ChecklistRenderer } from "./ChecklistRenderer";
import { JsonView } from "./JsonView";

export function Preview() {
    const { checklist, db } = useSelectedChecklist();
    const [tab, setTab] = useState<"json" | "preview">("preview");

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

    return (
        <aside className="panel panel-r">
            <div className="r-tabs">
                <button className={`r-tab${tab === "preview" ? " active" : ""}`} onClick={() => setTab("preview")}>
                    <span className="glyph">▶</span>
                    <span>Preview</span>
                </button>
                <button className={`r-tab${tab === "json" ? " active" : ""}`} onClick={() => setTab("json")}>
                    <span className="glyph">{"{ }"}</span>
                    <span>JSON</span>
                </button>
            </div>

            <div className="r-body">
                {tab === "json" ? (
                    <JsonView json={json} />
                ) : (
                    <div className="ecl-preview-wrap">
                        <ChecklistRenderer checklist={checklist} />
                    </div>
                )}
            </div>
        </aside>
    );
}
