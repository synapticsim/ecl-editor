import { useState } from "react";
import "./Editor.css";
import {
    DndContext,
    DragOverlay,
    MeasuringStrategy,
    closestCenter,
    getFirstCollision,
    pointerWithin,
    rectIntersection,
    PointerSensor,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import type { ChecklistItem } from "../../checklist";
import { ROOT_DROP_ID, branchDropId, parseDropId, useDispatch, useSelectedChecklist } from "../../state";
import { findItem } from "../../itemUtils";
import { EditorHeader } from "./EditorHeader";
import { ItemList } from "./ItemList";
import { ItemOverlay } from "./ItemOverlay";

const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

/** Map every list container (root + each branch) to the ids of its direct items. */
function buildContainerMap(items: ChecklistItem[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    function walk(list: ChecklistItem[], dropId: string) {
        map[dropId] = list.map((it) => it.id);
        for (const it of list) {
            if (it.type === "conditional") {
                walk(it.paths.YES, branchDropId(it.id, "YES"));
                walk(it.paths.NO, branchDropId(it.id, "NO"));
            } else if (it.type === "multi-select") {
                for (const key of Object.keys(it.paths)) walk(it.paths[key], branchDropId(it.id, key));
            }
        }
    }
    walk(items, ROOT_DROP_ID);
    return map;
}

export function Editor() {
    const { checklist, db } = useSelectedChecklist();
    const dispatch = useDispatch();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const [activeId, setActiveId] = useState<string | null>(null);

    if (!checklist) {
        return (
            <main className="panel panel-m">
                <div className="m-empty">No checklist selected. Pick one from the sidebar, or create a new one.</div>
            </main>
        );
    }

    const activeItem = activeId ? findItem(checklist.items, activeId) : null;
    const containerMap = buildContainerMap(checklist.items);

    // Nested-aware collision detection: resolve the container under the pointer,
    // then pick the closest item within it. Lets items drop between adjacent
    // nested blocks (the gap belongs to the parent list) and into empty branches.
    const collisionDetection: CollisionDetection = (args) => {
        const pointer = pointerWithin(args);
        const intersections = pointer.length > 0 ? pointer : rectIntersection(args);
        let overId = getFirstCollision(intersections, "id");
        if (overId == null) return [];

        if (typeof overId === "string" && parseDropId(overId)) {
            const childIds = containerMap[overId] ?? [];
            if (childIds.length > 0) {
                const closest = closestCenter({
                    ...args,
                    droppableContainers: args.droppableContainers.filter((c) =>
                        childIds.includes(String(c.id)),
                    ),
                });
                const inner = getFirstCollision(closest, "id");
                if (inner != null) overId = inner;
            }
        }
        return [{ id: overId }];
    };

    function handleDragStart(e: DragStartEvent) {
        setActiveId(String(e.active.id));
    }

    function handleDragOver(e: DragOverEvent) {
        const { active, over } = e;
        if (!over) return;
        dispatch({ type: "drag-over", activeId: String(active.id), overId: String(over.id) });
    }

    function handleDragEnd(e: DragEndEvent) {
        setActiveId(null);
        const { active, over } = e;
        if (!over) return;
        dispatch({ type: "drag-end", activeId: String(active.id), overId: String(over.id) });
    }

    return (
        <main className="panel panel-m">
            <EditorHeader checklist={checklist} db={db} />
            <div className="m-body">
                <DndContext
                    sensors={sensors}
                    collisionDetection={collisionDetection}
                    measuring={measuring}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <ItemList items={checklist.items} loc={{ kind: "root" }} numberPrefix="" startAt={1} />
                    <DragOverlay>{activeItem ? <ItemOverlay item={activeItem} /> : null}</DragOverlay>
                </DndContext>
            </div>
        </main>
    );
}
