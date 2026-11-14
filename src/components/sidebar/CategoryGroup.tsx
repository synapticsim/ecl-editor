import { useDraggable } from "@dnd-kit/core";

import type { Category, CategoryEntry, Section } from "../../checklist";
import { Icon } from "../../icons";
import { useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { EditableText } from "../common/EditableText";
import { ChecklistLeaf } from "./ChecklistLeaf";
import { DropLine, isSlot, SECTION_BLOCK_ATTR, useDropZone, useTreeDnd } from "./treeDnd";

interface Props {
    dbId: string;
    label: string;
    /** Noun used in section-related affordances, e.g. "System" or "Section". */
    sectionWord: string;
    category: Category;
    entries: CategoryEntry[];
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

/** A category's interleaved top-level checklists and named sections — used
 *  uniformly for normal, non-normal, and procedure. Drag-and-drop is owned by
 *  the parent DatabaseNode (shared across categories); this only registers the
 *  drop zones and draws the insertion line. */
export function CategoryGroup({ dbId, label, sectionWord, category, entries, selectedId, query, onSelect }: Props) {
    const dispatch = useDispatch();
    const { intent } = useTreeDnd();
    const start = useDropZone({ kind: "cat-start", category });
    const end = useDropZone({ kind: "cat-end", category });
    const checklistCount = entries.reduce((n, e) => n + (e.kind === "checklist" ? 1 : e.checklists.length), 0);
    const q = query.trim().toLowerCase();

    function renderEntry(entry: CategoryEntry) {
        if (entry.kind === "checklist") {
            if (q && !entry.name.toLowerCase().includes(q)) return null;
            return (
                <ChecklistLeaf
                    key={entry.id}
                    checklist={entry}
                    category={category}
                    selected={entry.id === selectedId}
                    onSelect={onSelect}
                />
            );
        }
        return (
            <SectionBlock
                key={entry.id}
                dbId={dbId}
                category={category}
                sectionWord={sectionWord}
                section={entry}
                selectedId={selectedId}
                query={query}
                onSelect={onSelect}
            />
        );
    }

    return (
        <>
            <div className="tree-cat" ref={start.setNodeRef} {...start.zoneProps}>
                <span>{label}</span>
                <span className="count">{checklistCount}</span>
                <button
                    className="add"
                    title={`Add checklist to ${label}`}
                    onClick={() => dispatch({ type: "add-checklist", dbId, category })}
                >
                    +
                </button>
                <button
                    className="add"
                    title={`Add ${sectionWord.toLowerCase()} to ${label}`}
                    onClick={() => dispatch({ type: "add-section", dbId, category })}
                >
                    §
                </button>
            </div>
            {entries.map(renderEntry)}
            <div className="tree-cat-end" ref={end.setNodeRef} {...end.zoneProps}>
                {isSlot(intent, category, undefined, null) && <DropLine />}
            </div>
        </>
    );
}

function SectionBlock({
    dbId,
    category,
    sectionWord,
    section,
    selectedId,
    query,
    onSelect,
}: {
    dbId: string;
    category: Category;
    sectionWord: string;
    section: Section;
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}) {
    const dispatch = useDispatch();
    const confirm = useConfirm();
    const { intent, dragDisabled } = useTreeDnd();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: section.id, disabled: dragDisabled });
    const header = useDropZone({ kind: "section", category, id: section.id });

    const q = query.trim().toLowerCase();
    const checklists = q ? section.checklists.filter((cl) => cl.name.toLowerCase().includes(q)) : section.checklists;
    if (q && checklists.length === 0) return null;

    async function handleDeleteSection(e: React.MouseEvent) {
        e.stopPropagation();
        const count = section.checklists.length;
        if (count === 0) {
            dispatch({ type: "delete-section", dbId, category, id: section.id });
            return;
        }
        const ok = await confirm({
            title: `Delete ${sectionWord.toLowerCase()}`,
            message: `Delete "${section.name}" and its ${count} checklist${count === 1 ? "" : "s"}? This can't be undone.`,
        });
        if (ok) dispatch({ type: "delete-section", dbId, category, id: section.id });
    }

    return (
        <>
            {isSlot(intent, category, undefined, section.id) && <DropLine />}
            <div
                className={`tree-section${isDragging ? " dragging" : ""}${intent?.sectionId === section.id ? " drop-into" : ""}`}
                {...{ [SECTION_BLOCK_ATTR]: section.id }}
            >
                <div
                    ref={(node) => {
                        setNodeRef(node);
                        header.setNodeRef(node);
                    }}
                    {...header.zoneProps}
                    className="tree-section-header"
                    {...attributes}
                    {...listeners}
                >
                    <span className="sh-name" onPointerDown={(e) => e.stopPropagation()}>
                        <EditableText
                            value={section.name}
                            onCommit={(next) =>
                                dispatch({ type: "rename-section", dbId, category, id: section.id, name: next })
                            }
                            multiline
                            clampLines={2}
                            commit="blur"
                        />
                    </span>
                    <button
                        className="sh-add"
                        title={`Add checklist to ${section.name}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: "add-checklist", dbId, category, sectionId: section.id });
                        }}
                    >
                        +
                    </button>
                    <button
                        className="tree-del"
                        title={`Delete ${sectionWord.toLowerCase()}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={handleDeleteSection}
                    >
                        <Icon name="trash" size={11} />
                    </button>
                </div>
                {checklists.map((cl) => (
                    <ChecklistLeaf
                        key={cl.id}
                        checklist={cl}
                        category={category}
                        sectionId={section.id}
                        selected={cl.id === selectedId}
                        onSelect={onSelect}
                    />
                ))}
                {isSlot(intent, category, section.id, null) && <DropLine inSection />}
            </div>
        </>
    );
}
