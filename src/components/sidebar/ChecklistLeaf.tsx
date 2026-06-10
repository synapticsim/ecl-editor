import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Checklist } from "../../checklist";
import { countItems } from "../../itemUtils";
import { useDispatch } from "../../state";
import { useConfirm } from "../common/confirmContext";
import { Icon } from "../../icons";

interface Props {
    checklist: Checklist;
    selected: boolean;
    inSection: boolean;
    onSelect: (id: string) => void;
}

export function ChecklistLeaf({ checklist, selected, inSection, onSelect }: Props) {
    const dispatch = useDispatch();
    const confirm = useConfirm();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: checklist.id,
    });

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
        <div
            ref={setNodeRef}
            className={`tree-leaf${inSection ? " in-section" : ""}${selected ? " selected" : ""}${isDragging ? " dragging" : ""}`}
            style={{ transform: CSS.Transform.toString(transform), transition }}
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
            <span className="leaf-name">{checklist.name}</span>
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
    );
}
