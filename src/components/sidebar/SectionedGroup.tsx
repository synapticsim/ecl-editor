import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Section } from "../../checklist";
import { Icon } from "../../icons";
import { type SectionedCategory, sectionDropId, useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { EditableText } from "../common/EditableText";
import { ChecklistLeaf } from "./ChecklistLeaf";

interface Props {
    dbId: string;
    label: string;
    /** Noun used in section-related affordances, e.g. "System" or "Section". */
    sectionWord: string;
    category: SectionedCategory;
    sections: Section[];
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

/** Non-normal (by system) and procedure (by section) checklists: always grouped.
 *  Drag-and-drop is owned by the parent DatabaseNode (shared across categories);
 *  this only registers the sortable/droppable containers. */
export function SectionedGroup({ dbId, label, sectionWord, category, sections, selectedId, query, onSelect }: Props) {
    const dispatch = useDispatch();
    const checklistCount = sections.reduce((n, s) => n + s.checklists.length, 0);
    const q = query.trim().toLowerCase();

    function renderSection(sec: Section) {
        return (
            <SectionBlock
                key={sec.id}
                dbId={dbId}
                category={category}
                sectionWord={sectionWord}
                section={sec}
                selectedId={selectedId}
                query={query}
                onSelect={onSelect}
            />
        );
    }

    return (
        <>
            <div className="tree-cat">
                <span>{label}</span>
                <span className="count">{checklistCount}</span>
                <button
                    className="add"
                    title={`Add ${sectionWord.toLowerCase()} to ${label}`}
                    onClick={() => dispatch({ type: "add-section", dbId, category })}
                >
                    §
                </button>
            </div>
            {q ? (
                sections.map(renderSection)
            ) : (
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {sections.map(renderSection)}
                </SortableContext>
            )}
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
    category: SectionedCategory;
    sectionWord: string;
    section: Section;
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}) {
    const dispatch = useDispatch();
    const confirm = useConfirm();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
    const { setNodeRef: setDropRef } = useDroppable({ id: sectionDropId(section.id) });

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
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
            <div className={`tree-section-header${isDragging ? " dragging" : ""}`} {...attributes} {...listeners}>
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
            <div ref={setDropRef}>
                <SortableContext items={checklists.map((cl) => cl.id)} strategy={verticalListSortingStrategy}>
                    {checklists.map((cl) => (
                        <ChecklistLeaf
                            key={cl.id}
                            checklist={cl}
                            selected={cl.id === selectedId}
                            inSection
                            onSelect={onSelect}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
