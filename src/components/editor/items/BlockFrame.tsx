import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ConditionalItem, MultiSelectItem } from "../../../checklist";
import { useDispatch } from "../../../state";
import { EditableText } from "../../common/EditableText";

interface Props {
    item: ConditionalItem | MultiSelectItem;
    number: string;
    color: string;
    pill: string;
    children: ReactNode;
}

/** Sortable bordered container for conditional / multi-select items. */
export function BlockFrame({ item, number, color, pill, children }: Props) {
    const dispatch = useDispatch();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`vH-block${isDragging ? " dragging" : ""}`}
            data-type={item.type}
            style={{ "--ic": color, transform: CSS.Transform.toString(transform), transition } as React.CSSProperties}
        >
            <div className="vH-block-head">
                <span className="vH-num">{number}</span>
                <span className="vH-drag" {...attributes} {...listeners}>
                    ⋮⋮
                </span>
                <span className="vH-bar" />
                <div className="vH-block-prompt">
                    <span className="vH-block-pill">{pill}</span>
                    <EditableText
                        value={item.challenge}
                        onCommit={(v) => dispatch({ type: "update-item", itemId: item.id, patch: { challenge: v } })}
                        className="grow"
                        placeholder="Prompt…"
                    />
                </div>
                <button
                    className="vH-del"
                    title="Delete item"
                    onClick={() => dispatch({ type: "delete-item", itemId: item.id })}
                >
                    ×
                </button>
            </div>
            <div className="vH-block-body">{children}</div>
        </div>
    );
}
