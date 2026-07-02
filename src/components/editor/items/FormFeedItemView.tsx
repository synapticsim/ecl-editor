import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { FormFeedItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { useDispatch } from "../../../state";

export function FormFeedItemView({ item, number }: { item: FormFeedItem; number: string }) {
    const dispatch = useDispatch();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`vH-ff${isDragging ? " dragging" : ""}`}
            style={
                {
                    "--ic": ITEM_TYPE_META["form-feed"].cssVar,
                    transform: CSS.Transform.toString(transform),
                    transition,
                } as React.CSSProperties
            }
        >
            <span className="vH-num">{number}</span>
            <span className="vH-drag" {...attributes} {...listeners}>
                ⋮⋮
            </span>
            <span className="vH-bar" />
            <span className="vH-ff-content">
                <span className="vH-ff-line" />
                <span className="vH-ff-label">page break</span>
                <span className="vH-ff-line" />
            </span>
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
