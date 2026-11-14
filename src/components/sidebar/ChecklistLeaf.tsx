import { useDraggable } from "@dnd-kit/core";

import type { Category, Checklist } from "../../checklist";
import { Icon } from "../../icons";
import { countItems } from "../../itemUtils";
import { useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { DropLine, isSlot, useDropZone, useTreeDnd } from "./treeDnd";

interface Props {
    checklist: Checklist;
    category: Category;
    /** The section holding this checklist; absent for a top-level entry. */
    sectionId?: string;
    selected: boolean;
    onSelect: (id: string) => void;
}

export function ChecklistLeaf({ checklist, category, sectionId, selected, onSelect }: Props) {
    const dispatch = useDispatch();
    const confirm = useConfirm();
    const inSection = sectionId !== undefined;
    const { intent, dragDisabled } = useTreeDnd();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: checklist.id,
        disabled: dragDisabled,
    });
    const zone = useDropZone({ kind: "leaf", category, sectionId, id: checklist.id });

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        const count = countItems(checklist.items);
        if (count > 0) {
            const ok = await confirm({
                title: "Delete checklist",
                message: `"${checklist.name}" contains ${count} item${count === 1 ? "" : "s"}. This can't be undone.`,
            });
            if (!ok) return;
        }
        dispatch({ type: "delete-checklist", id: checklist.id });
    }

    return (
        <>
            {isSlot(intent, category, sectionId, checklist.id) && <DropLine inSection={inSection} />}
            <div
                ref={(node) => {
                    setNodeRef(node);
                    zone.setNodeRef(node);
                }}
                {...zone.zoneProps}
                className={`tree-leaf${inSection ? " in-section" : ""}${selected ? " selected" : ""}${isDragging ? " dragging" : ""}`}
                onClick={() => onSelect(checklist.id)}
            >
                <span
                    className="leaf-drag"
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                    {...attributes}
                    {...listeners}
                >
                    ⋮⋮
                </span>
                <span className="leaf-name">
                    {checklist.name.split("\n").map((line, i) => (
                        <span key={i} className="leaf-name-line">
                            {line}
                        </span>
                    ))}
                </span>
                <button
                    className="vH-del"
                    title="Delete checklist"
                    onClick={handleDelete}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icon name="trash" size={11} />
                </button>
                <span className="leaf-meta">{countItems(checklist.items)}</span>
            </div>
        </>
    );
}
