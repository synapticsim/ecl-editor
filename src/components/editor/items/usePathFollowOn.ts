import { useState } from "react";

import { allChecklists, useDispatch, useSelectedChecklist } from "../../../state";

/** Owns state + resolution for one branch's follow-on (conditional YES/NO,
 *  multi-select option) — a branch can trigger one or more checklists when
 *  taken/selected, independent of whether it has any items ("router"
 *  branches often have none). */
export function usePathFollowOn(itemId: string, pathKey: string, followOn: string[] | undefined) {
    const dispatch = useDispatch();
    const { checklist, db } = useSelectedChecklist();
    const [open, setOpen] = useState(!!followOn && followOn.length > 0);
    // A pending, not-yet-resolved extra follow-on row — kept out of `followOn`
    // itself so an unfilled slot never trips the "unresolved" warning.
    const [extraBlank, setExtraBlank] = useState(false);

    const otherChecklists = db ? allChecklists(db).filter((cl) => cl.id !== checklist?.id) : [];
    const nameOf = (id: string) => otherChecklists.find((cl) => cl.id === id)?.name ?? id;
    const isResolved = (id: string) => otherChecklists.some((cl) => cl.id === id);
    const idOf = (name: string) => otherChecklists.find((cl) => cl.name === name)?.id;
    const options = otherChecklists.map((cl) => cl.name);

    const baseFollowOn = followOn ?? [];
    const active = baseFollowOn.length > 0 || open;
    const unresolved = baseFollowOn.some((id) => !isResolved(id));

    function update(next: string[] | undefined) {
        dispatch({ type: "set-path-follow-on", itemId, key: pathKey, followOn: next });
    }

    function toggle() {
        if (baseFollowOn.length > 0) {
            update(undefined);
            setOpen(false);
            setExtraBlank(false);
        } else {
            setOpen(!open);
        }
    }

    function setAt(index: number, name: string) {
        const id = idOf(name);
        if (!id) return;
        if (index < baseFollowOn.length) {
            const next = baseFollowOn.slice();
            next[index] = id;
            update(next);
        } else {
            update([...baseFollowOn, id]);
            setExtraBlank(false);
        }
    }

    function removeAt(index: number) {
        if (index < baseFollowOn.length) {
            const next = baseFollowOn.filter((_, i) => i !== index);
            update(next.length > 0 ? next : undefined);
        } else {
            setExtraBlank(false);
        }
    }

    return {
        active,
        unresolved,
        baseFollowOn,
        extraBlank,
        options,
        nameOf,
        toggle,
        setAt,
        removeAt,
        addBlank: () => setExtraBlank(true),
    };
}
