import { useState } from "react";
import "./Sidebar.css";
import { useAppState, useDispatch } from "../../state";
import { Icon } from "../../icons";
import { DatabaseNode } from "./DatabaseNode";

export function Sidebar() {
    const { databases, selectedChecklistId } = useAppState();
    const dispatch = useDispatch();
    const [query, setQuery] = useState("");

    return (
        <aside className="panel panel-l">
            <div className="l-search">
                <Icon name="search" size={11} />
                <input
                    placeholder="Search checklists…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
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
                <button>
                    <Icon name="download" size={11} /> Import
                </button>
            </div>
        </aside>
    );
}
