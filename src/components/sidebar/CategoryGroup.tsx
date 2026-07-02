import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Category, CategoryEntry } from "../../checklist";
import { isHeader } from "../../checklist";
import { Icon } from "../../icons";
import { useDispatch } from "../../state";
import { EditableText } from "../common/EditableText";
import { ChecklistLeaf } from "./ChecklistLeaf";

interface Props {
    dbId: string;
    label: string;
    category: Category;
    entries: CategoryEntry[];
    allowHeaders: boolean;
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

export function CategoryGroup({ dbId, label, category, entries, allowHeaders, selectedId, query, onSelect }: Props) {
    const dispatch = useDispatch();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const checklistCount = entries.filter((e) => !isHeader(e)).length;

    function handleDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            dispatch({
                type: "reorder-category",
                dbId,
                category,
                activeId: String(active.id),
                overId: String(over.id),
            });
        }
    }

    const q = query.trim().toLowerCase();
    const filtered = q ? entries.filter((e) => !isHeader(e) && e.name.toLowerCase().includes(q)) : entries;

    function renderEntry(entry: CategoryEntry) {
        if (isHeader(entry)) {
            return <SectionHeaderRow key={entry.id} dbId={dbId} category={category} id={entry.id} name={entry.name} />;
        }
        return (
            <ChecklistLeaf
                key={entry.id}
                checklist={entry}
                selected={entry.id === selectedId}
                inSection={allowHeaders}
                onSelect={onSelect}
            />
        );
    }

    return (
        <>
            <div className="tree-cat">
                <span>{label}</span>
                <span className="count">{checklistCount}</span>
                {allowHeaders && (
                    <button
                        className="add"
                        title={`Add section to ${label}`}
                        onClick={() => dispatch({ type: "add-section-header", dbId, category })}
                    >
                        §
                    </button>
                )}
                <button
                    className="add"
                    title={`Add checklist to ${label}`}
                    onClick={() => dispatch({ type: "add-checklist", dbId, category })}
                >
                    +
                </button>
            </div>
            {q ? (
                filtered.map(renderEntry)
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                        {entries.map(renderEntry)}
                    </SortableContext>
                </DndContext>
            )}
        </>
    );
}

function SectionHeaderRow({
    dbId,
    category,
    id,
    name,
}: {
    dbId: string;
    category: Category;
    id: string;
    name: string;
}) {
    const dispatch = useDispatch();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`tree-section-header${isDragging ? " dragging" : ""}`}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            {...attributes}
            {...listeners}
        >
            <span className="sh-name" onPointerDown={(e) => e.stopPropagation()}>
                <EditableText
                    value={name}
                    onCommit={(next) => dispatch({ type: "rename-header", dbId, category, id, name: next })}
                    autoSize
                />
            </span>
            <button
                className="tree-del"
                title="Delete section"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "delete-header", dbId, category, id });
                }}
            >
                <Icon name="trash" size={11} />
            </button>
        </div>
    );
}
