import { useState } from "react";

import type { ChecklistDatabase } from "../../checklist";
import { Icon } from "../../icons";
import { useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { EditableText } from "../common/EditableText";
import { CategoryGroup } from "./CategoryGroup";

interface Props {
    db: ChecklistDatabase;
    defaultOpen: boolean;
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

export function DatabaseNode({ db, defaultOpen, selectedId, query, onSelect }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const dispatch = useDispatch();
    const confirm = useConfirm();

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        const ok = await confirm({
            title: "Delete database",
            message: `Delete "${db.name}" and all of its checklists? This can't be undone.`,
        });
        if (ok) dispatch({ type: "delete-database", dbId: db.id });
    }

    return (
        <div className={`tree-db${open ? " open" : ""}`}>
            <div className={`tree-row${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)}>
                <span className="chev">▶</span>
                <span className="ico" />
                <span className="label" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <EditableText
                        value={db.name}
                        onCommit={(name) => dispatch({ type: "rename-database", dbId: db.id, name })}
                        commit="blur"
                        className="grow"
                    />
                </span>
                <button className="tree-del" title="Delete database" onClick={handleDelete}>
                    <Icon name="trash" size={11} />
                </button>
                <span className="meta mono">{db.version}</span>
            </div>

            {open && (
                <>
                    <CategoryGroup
                        dbId={db.id}
                        label="Normal"
                        category="normal"
                        entries={db.categories.normal}
                        allowHeaders={false}
                        selectedId={selectedId}
                        query={query}
                        onSelect={onSelect}
                    />
                    <CategoryGroup
                        dbId={db.id}
                        label="Non-Normal"
                        category="non-normal"
                        entries={db.categories["non-normal"]}
                        allowHeaders
                        selectedId={selectedId}
                        query={query}
                        onSelect={onSelect}
                    />
                    <CategoryGroup
                        dbId={db.id}
                        label="Procedure"
                        category="procedure"
                        entries={db.categories.procedure}
                        allowHeaders
                        selectedId={selectedId}
                        query={query}
                        onSelect={onSelect}
                    />
                </>
            )}
        </div>
    );
}
