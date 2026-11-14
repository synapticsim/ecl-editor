import {
    type CollisionDetection,
    closestCenter,
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    PointerSensor,
    pointerWithin,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";

import type { ChecklistDatabase, Section } from "../../checklist";
import { Icon } from "../../icons";
import { allChecklists, useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { EditableText } from "../common/EditableText";
import { CategoryGroup } from "./CategoryGroup";
import { CATEGORIES, type DropIntent, type DropZone, resolveIntent, TreeDndContext } from "./treeDnd";

interface Props {
    db: ChecklistDatabase;
    defaultOpen: boolean;
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
}

// The row under the pointer decides the slot; fall back to the nearest row
// when the pointer is in a gap between rows.
const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : closestCenter(args);
};

function isSectionId(db: ChecklistDatabase, id: string): boolean {
    return CATEGORIES.some((category) => db.categories[category].some((e) => e.kind === "section" && e.id === id));
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

    const [intent, setIntent] = useState<DropIntent | null>(null);
    const pointerY = useRef(0);
    const overZone = useRef<DropZone | null>(null);
    const dragging = useRef<{ id: string; isSection: boolean } | null>(null);
    const dbRef = useRef(db);
    dbRef.current = db;

    function recompute() {
        const d = dragging.current;
        const zone = overZone.current;
        setIntent(d && zone ? resolveIntent(dbRef.current, d.id, d.isSection, zone, pointerY.current) : null);
    }

    // dnd-kit's `over` only changes when the pointer crosses into another row;
    // the before/after half within a row needs the raw pointer position.
    useEffect(() => {
        if (!activeId) return;
        const onMove = (e: PointerEvent) => {
            pointerY.current = e.clientY;
            recompute();
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
        // biome-ignore lint/correctness/useExhaustiveDependencies: recompute reads refs only
    }, [activeId]);

    function resetDrag() {
        setActiveId(null);
        setIntent(null);
        dragging.current = null;
        overZone.current = null;
    }

    function handleDragStart(e: DragStartEvent) {
        const id = String(e.active.id);
        if (e.activatorEvent instanceof PointerEvent) pointerY.current = e.activatorEvent.clientY;
        dragging.current = { id, isSection: isSectionId(db, id) };
        setActiveId(id);
    }

    function handleDragOver(e: DragOverEvent) {
        overZone.current = (e.over?.data.current?.zone as DropZone | undefined) ?? null;
        recompute();
    }

    function handleDragEnd(_e: DragEndEvent) {
        const d = dragging.current;
        const target = intent;
        resetDrag();
        if (!d || !target) return;
        if (d.isSection) {
            dispatch({
                type: "move-section",
                dbId: db.id,
                sectionId: d.id,
                toCategory: target.category,
                beforeId: target.beforeId ?? undefined,
            });
        } else {
            dispatch({
                type: "move-checklist",
                dbId: db.id,
                checklistId: d.id,
                toCategory: target.category,
                toSectionId: target.sectionId,
                beforeId: target.beforeId ?? undefined,
            });
        }
    }

    const activeChecklist = activeId ? (allChecklists(db).find((cl) => cl.id === activeId) ?? null) : null;
    const activeSection =
        activeId && !activeChecklist
            ? (CATEGORIES.flatMap((category) => db.categories[category]).find(
                  (e): e is Section => e.kind === "section" && e.id === activeId,
              ) ?? null)
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
                    collisionDetection={collisionDetection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={resetDrag}
                >
                    <TreeDndContext.Provider value={{ intent, dragDisabled: query.trim() !== "" }}>
                        <CategoryGroup
                            dbId={db.id}
                            label="Normal"
                            sectionWord="Section"
                            category="normal"
                            entries={db.categories.normal}
                            selectedId={selectedId}
                            query={query}
                            onSelect={onSelect}
                        />
                        <CategoryGroup
                            dbId={db.id}
                            label="Non-Normal"
                            sectionWord="System"
                            category="non_normal"
                            entries={db.categories.non_normal}
                            selectedId={selectedId}
                            query={query}
                            onSelect={onSelect}
                        />
                        <CategoryGroup
                            dbId={db.id}
                            label="Procedure"
                            sectionWord="Section"
                            category="procedure"
                            entries={db.categories.procedure}
                            selectedId={selectedId}
                            query={query}
                            onSelect={onSelect}
                        />
                        <DragOverlay dropAnimation={null}>
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
                    </TreeDndContext.Provider>
                </DndContext>
            )}
        </div>
    );
}
