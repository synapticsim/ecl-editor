import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { Checklist } from "../../checklist";
import { NORMAL_DROP_ID, useDispatch } from "../../state";
import { ChecklistLeaf } from "./ChecklistLeaf";

interface Props {
    dbId: string;
    label: string;
    checklists: Checklist[];
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

/** Flat checklist list for the "normal" category — the only one without sections.
 *  Drag-and-drop is owned by the parent DatabaseNode (shared across categories);
 *  this only registers the sortable/droppable containers. */
export function CategoryGroup({ dbId, label, checklists, selectedId, query, onSelect }: Props) {
    const dispatch = useDispatch();
    const { setNodeRef } = useDroppable({ id: NORMAL_DROP_ID });

    const q = query.trim().toLowerCase();
    const filtered = q ? checklists.filter((cl) => cl.name.toLowerCase().includes(q)) : checklists;

    function renderLeaf(cl: Checklist) {
        return (
            <ChecklistLeaf
                key={cl.id}
                checklist={cl}
                selected={cl.id === selectedId}
                inSection={false}
                onSelect={onSelect}
            />
        );
    }

    return (
        <>
            <div className="tree-cat">
                <span>{label}</span>
                <span className="count">{checklists.length}</span>
                <button
                    className="add"
                    title={`Add checklist to ${label}`}
                    onClick={() => dispatch({ type: "add-checklist", dbId, category: "normal" })}
                >
                    +
                </button>
            </div>
            {q ? (
                filtered.map(renderLeaf)
            ) : (
                <div ref={setNodeRef}>
                    <SortableContext items={checklists.map((cl) => cl.id)} strategy={verticalListSortingStrategy}>
                        {checklists.map(renderLeaf)}
                    </SortableContext>
                </div>
            )}
        </>
    );
}
