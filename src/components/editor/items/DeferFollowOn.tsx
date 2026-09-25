import { useState } from "react";

import { allChecklists, useSelectedChecklist } from "../../../state";
import { Combobox } from "../../common/Combobox";
import { FollowOnRows } from "./FollowOnRows";

interface Props {
    defer?: string;
    followOn?: string[];
    color: string;
    onUpdate: (patch: { defer?: string; followOn?: string[] }) => void;
}

/** Defer / follow-on toggle buttons + combobox rows, shared across item types.
 *  `defer` is a single target; `followOn` can list several. */
export function DeferFollowOn({ defer, followOn, color, onUpdate }: Props) {
    const { checklist, db } = useSelectedChecklist();
    const [deferOpen, setDeferOpen] = useState(!!defer);
    const [followOnOpen, setFollowOnOpen] = useState(!!followOn && followOn.length > 0);
    // A pending, not-yet-resolved extra follow-on row — kept out of `followOn`
    // itself so an unfilled slot never trips the "unresolved" warning.
    const [extraBlank, setExtraBlank] = useState(false);

    const otherChecklists = db ? allChecklists(db).filter((cl) => cl.id !== checklist?.id) : [];
    const nameOf = (id: string) => otherChecklists.find((cl) => cl.id === id)?.name ?? id;
    const isResolved = (id: string) => otherChecklists.some((cl) => cl.id === id);
    const idOf = (name: string) => otherChecklists.find((cl) => cl.name === name)?.id;
    const options = otherChecklists.map((cl) => cl.name);

    const deferActive = !!defer || deferOpen;
    const followOnActive = (followOn && followOn.length > 0) || followOnOpen;
    const deferUnresolved = !!defer && !isResolved(defer);
    const followOnUnresolved = !!followOn?.some((id) => !isResolved(id));

    const sensedStyle = { "--sensed": color } as React.CSSProperties;
    const baseFollowOn = followOn ?? [];

    function toggleDefer() {
        if (defer !== undefined) {
            onUpdate({ defer: undefined });
            setDeferOpen(false);
        } else {
            setDeferOpen(!deferOpen);
        }
    }

    function toggleFollowOn() {
        if (followOn !== undefined && followOn.length > 0) {
            onUpdate({ followOn: undefined });
            setFollowOnOpen(false);
            setExtraBlank(false);
        } else {
            setFollowOnOpen(!followOnOpen);
        }
    }

    function setFollowOnAt(index: number, name: string) {
        const id = idOf(name);
        if (!id) return;
        if (index < baseFollowOn.length) {
            const next = baseFollowOn.slice();
            next[index] = id;
            onUpdate({ followOn: next });
        } else {
            onUpdate({ followOn: [...baseFollowOn, id] });
            setExtraBlank(false);
        }
    }

    function removeFollowOnAt(index: number) {
        if (index < baseFollowOn.length) {
            const next = baseFollowOn.filter((_, i) => i !== index);
            onUpdate({ followOn: next.length > 0 ? next : undefined });
        } else {
            setExtraBlank(false);
        }
    }

    return (
        <>
            <div className="vH-meta" style={sensedStyle}>
                <button
                    className={`vH-flag${deferActive ? " active" : ""}${deferUnresolved ? " warn" : ""}`}
                    title={
                        deferUnresolved ? "Deferred checklist not found in this package" : "Defer to another checklist"
                    }
                    onClick={toggleDefer}
                >
                    DEFER{deferUnresolved && " ⚠"}
                </button>
                <button
                    className={`vH-flag${followOnActive ? " active" : ""}${followOnUnresolved ? " warn" : ""}`}
                    title={
                        followOnUnresolved
                            ? "Follow-on checklist not found in this package"
                            : "Follow on to one or more checklists"
                    }
                    onClick={toggleFollowOn}
                >
                    FOLLOW-ON{followOnUnresolved && " ⚠"}
                </button>
            </div>
            {deferActive && (
                <div className="vH-meta" style={sensedStyle}>
                    <span className="vH-meta-k">DEFER</span>
                    <span className="vH-meta-v">
                        <Combobox
                            value={defer ? nameOf(defer) : ""}
                            options={options}
                            onChange={(name) => onUpdate({ defer: idOf(name) })}
                            placeholder="select checklist…"
                        />
                    </span>
                </div>
            )}
            {followOnActive && (
                <FollowOnRows
                    followOn={baseFollowOn}
                    extraBlank={extraBlank}
                    onAddBlank={() => setExtraBlank(true)}
                    onSetAt={setFollowOnAt}
                    onRemoveAt={removeFollowOnAt}
                    nameOf={nameOf}
                    options={options}
                />
            )}
        </>
    );
}
