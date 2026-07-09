import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { useState } from "react";

import type { Category, ChecklistDatabase } from "../../checklist";
import { Icon } from "../../icons";
import { allChecklists, locateChecklist, NORMAL_DROP_ID, parseSectionDropId, useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { EditableText } from "../common/EditableText";
import { CategoryGroup } from "./CategoryGroup";
import { SectionedGroup } from "./SectionedGroup";

interface Props {
    db: ChecklistDatabase;
    defaultOpen: boolean;
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

interface DropTarget {
    category: Category;
    sectionId?: string;
    overChecklistId?: string;
}

function resolveDropTarget(db: ChecklistDatabase, overId: string): DropTarget | null {
    if (overId === NORMAL_DROP_ID) return { category: "normal" };
    if (db.categories.normal.some((cl) => cl.id === overId)) return { category: "normal", overChecklistId: overId };

    const dropSectionId = parseSectionDropId(overId);
    if (dropSectionId) {
        for (const category of ["non_normal", "procedure"] as const) {
            if (db.categories[category].some((s) => s.id === dropSectionId)) {
                return { category, sectionId: dropSectionId };
            }
        }
        return null;
    }

    for (const category of ["non_normal", "procedure"] as const) {
        for (const sec of db.categories[category]) {
            if (sec.id === overId) return { category, sectionId: sec.id };
            if (sec.checklists.some((cl) => cl.id === overId)) {
                return { category, sectionId: sec.id, overChecklistId: overId };
            }
        }
    }
    return null;
}

function isSectionId(db: ChecklistDatabase, id: string): boolean {
    return db.categories.non_normal.some((s) => s.id === id) || db.categories.procedure.some((s) => s.id === id);
}

export function DatabaseNode({ db, defaultOpen, selectedId, query, onSelect }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const [activeId, setActiveId] = useState<string | null>(null);
    const dispatch = useDispatch();
    const confirm = useConfirm();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        const ok = await confirm({
            title: "Delete database",
            message: `Delete "${db.name}" and all of its checklists? This can't be undone.`,
        });
        if (ok) dispatch({ type: "delete-database", dbId: db.id });
    }

    function handleDragStart(e: DragStartEvent) {
        setActiveId(String(e.active.id));
    }

    // Cross-container moves relocate live as you drag over a different
    // category/section (same-container reordering previews natively via
    // SortableContext and is finalized on drag-end).
    function handleDragOver(e: DragOverEvent) {
        const { active, over } = e;
        if (!over) return;
        const activeIdStr = String(active.id);
        const overId = String(over.id);
        if (activeIdStr === overId || isSectionId(db, activeIdStr)) return;

        const loc = locateChecklist(db, activeIdStr);
        const target = resolveDropTarget(db, overId);
        if (!loc || !target) return;

        const sameContainer = loc.category === target.category && (loc.section?.id ?? undefined) === target.sectionId;
        if (sameContainer) return;

        dispatch({
            type: "move-checklist",
            dbId: db.id,
            checklistId: activeIdStr,
            toCategory: target.category,
            toSectionId: target.sectionId,
            overId: target.overChecklistId,
        });
    }

    function handleDragEnd(e: DragEndEvent) {
        setActiveId(null);
        const { active, over } = e;
        if (!over) return;
        const activeIdStr = String(active.id);
        const overId = String(over.id);
        if (activeIdStr === overId) return;

        if (isSectionId(db, activeIdStr)) {
            for (const category of ["non_normal", "procedure"] as const) {
                const list = db.categories[category];
                if (list.some((s) => s.id === activeIdStr) && list.some((s) => s.id === overId)) {
                    dispatch({ type: "reorder-sections", dbId: db.id, category, activeId: activeIdStr, overId });
                }
            }
            return;
        }

        const target = resolveDropTarget(db, overId);
        if (!target) return;
        dispatch({
            type: "move-checklist",
            dbId: db.id,
            checklistId: activeIdStr,
            toCategory: target.category,
            toSectionId: target.sectionId,
            overId: target.overChecklistId,
        });
    }

    const activeChecklist = activeId ? (allChecklists(db).find((cl) => cl.id === activeId) ?? null) : null;
    const activeSection =
        activeId && !activeChecklist
            ? ([...db.categories.non_normal, ...db.categories.procedure].find((s) => s.id === activeId) ?? null)
            : null;

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
            </div>
            {open && (
                <div
                    className="tree-part-number"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <span className="tree-part-label">P/N</span>
                    <EditableText
                        value={db.partNumber ?? ""}
                        onCommit={(v) =>
                            dispatch({
                                type: "set-database-part-number",
                                dbId: db.id,
                                partNumber: v.trim() || undefined,
                            })
                        }
                        commit="blur"
                        placeholder="part number…"
                        className="grow"
                    />
                </div>
            )}

            {open && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <CategoryGroup
                        dbId={db.id}
                        label="Normal"
                        checklists={db.categories.normal}
                        selectedId={selectedId}
                        query={query}
                        onSelect={onSelect}
                    />
                    <SectionedGroup
                        dbId={db.id}
                        label="Non-Normal"
                        sectionWord="System"
                        category="non_normal"
                        sections={db.categories.non_normal}
                        selectedId={selectedId}
                        query={query}
                        onSelect={onSelect}
                    />
                    <SectionedGroup
                        dbId={db.id}
                        label="Procedure"
                        sectionWord="Section"
                        category="procedure"
                        sections={db.categories.procedure}
                        selectedId={selectedId}
                        query={query}
                        onSelect={onSelect}
                    />
                    <DragOverlay>
                        {activeChecklist && (
                            <div className="tree-leaf overlay">
                                <span className="leaf-name">{activeChecklist.name}</span>
                            </div>
                        )}
                        {activeSection && (
                            <div className="tree-section-header overlay">
                                <span className="sh-name">{activeSection.name}</span>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}
