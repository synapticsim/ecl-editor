import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ChecklistItem } from "../../../checklist";
import { useDispatch } from "../../../state";

interface Props {
    item: ChecklistItem;
    number: string;
    color: string;
    children: ReactNode;
}

/** Sortable single-row frame: index · drag handle · type bar · body · delete. */
export function RowFrame({ item, number, color, children }: Props) {
    const dispatch = useDispatch();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`vH-row${isDragging ? " dragging" : ""}`}
            data-type={item.type}
            style={{ "--ic": color, transform: CSS.Transform.toString(transform), transition } as React.CSSProperties}
        >
            <span className="vH-num">{number}</span>
            <span className="vH-drag" {...attributes} {...listeners}>
                ⋮⋮
            </span>
            <span className="vH-bar" />
            <div className="vH-body">{children}</div>
            <button
                className="vH-del"
                title="Delete item"
                onClick={() => dispatch({ type: "delete-item", itemId: item.id })}
            >
                ×
            </button>
        </div>
    );
}
