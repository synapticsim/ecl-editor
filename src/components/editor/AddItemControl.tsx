import { useEffect, useRef, useState } from "react";

import type { ItemType } from "../../checklist";
import { Icon } from "../../icons";
import { ITEM_TYPE_META } from "../../itemUtils";
import { type ListLoc, useDispatch } from "../../state";

const TYPES: ItemType[] = ["action", "conditional", "multi-select", "free-text", "form-feed"];

interface Props {
    loc: ListLoc;
    index: number;
    /** "between" sits in the gap between rows (revealed on hover); "end" is the
     *  persistent add affordance at the tail of a list / branch. */
    variant: "between" | "end";
}

export function AddItemControl({ loc, index, variant }: Props) {
    const dispatch = useDispatch();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onDown(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    function add(t: ItemType) {
        dispatch({ type: "add-item", loc, itemType: t, index });
        setOpen(false);
    }

    return (
        <div ref={ref} className={`add-ctl add-ctl-${variant}${open ? " open" : ""}`}>
            {open ? (
                <div className="add-ctl-menu mono">
                    {TYPES.map((t) => (
                        <button
                            key={t}
                            style={{ "--swatch": ITEM_TYPE_META[t].cssVar } as React.CSSProperties}
                            onClick={() => add(t)}
                        >
                            <span className="swatch" />
                            {ITEM_TYPE_META[t].toolbar}
                        </button>
                    ))}
                </div>
            ) : (
                <button className="add-ctl-trigger" onClick={() => setOpen(true)} title="Add item">
                    <span className="add-ctl-plus">
                        <Icon name="plus" size={10} />
                    </span>
                    {variant === "end" && <span className="add-ctl-label">Add item</span>}
                </button>
            )}
        </div>
    );
}
