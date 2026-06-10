import { Fragment } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ChecklistItem } from "../../checklist";
import { ROOT_DROP_ID, branchDropId, type ListLoc } from "../../state";
import { ChecklistItemView } from "./ChecklistItemView";
import { AddItemControl } from "./AddItemControl";

interface Props {
    items: ChecklistItem[];
    loc: ListLoc;
    numberPrefix: string;
    startAt: number;
}

export function ItemList({ items, loc, numberPrefix, startAt }: Props) {
    const dropId = loc.kind === "root" ? ROOT_DROP_ID : branchDropId(loc.parentId, loc.key);
    const { setNodeRef, isOver } = useDroppable({ id: dropId });
    const isRoot = loc.kind === "root";

    const empty = items.length === 0;
    const className = isRoot
        ? `vH${isOver ? " drop-active" : ""}`
        : `vH-branch-items${empty ? " empty" : ""}${isOver ? " drop-active" : ""}`;

    return (
        <div ref={setNodeRef} className={className}>
            <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                {items.map((it, i) => (
                    <Fragment key={it.id}>
                        {i > 0 && <AddItemControl loc={loc} index={i} variant="between" />}
                        <ChecklistItemView item={it} number={`${numberPrefix}${startAt + i}`} />
                    </Fragment>
                ))}
            </SortableContext>
            <AddItemControl loc={loc} index={items.length} variant={isRoot ? "end" : "between"} />
        </div>
    );
}
