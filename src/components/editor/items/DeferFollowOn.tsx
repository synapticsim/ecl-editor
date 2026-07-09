import { useState } from "react";

import { allChecklists, useSelectedChecklist } from "../../../state";
import { Combobox } from "../../common/Combobox";

interface Props {
    defer?: string;
    followOn?: string;
    color: string;
    onUpdate: (patch: { defer?: string; followOn?: string }) => void;
}

/** Defer / follow-on toggle buttons + combobox rows, shared across item types. */
export function DeferFollowOn({ defer, followOn, color, onUpdate }: Props) {
    const { checklist, db } = useSelectedChecklist();
    const [deferOpen, setDeferOpen] = useState(!!defer);
    const [followOnOpen, setFollowOnOpen] = useState(!!followOn);

    const otherChecklists = db ? allChecklists(db).filter((cl) => cl.id !== checklist?.id) : [];
    const nameOf = (id: string) => otherChecklists.find((cl) => cl.id === id)?.name ?? id;
    const isResolved = (id: string) => otherChecklists.some((cl) => cl.id === id);
    const idOf = (name: string) => otherChecklists.find((cl) => cl.name === name)?.id;
    const options = otherChecklists.map((cl) => cl.name);

    const deferActive = !!defer || deferOpen;
    const followOnActive = !!followOn || followOnOpen;
    const deferUnresolved = !!defer && !isResolved(defer);
    const followOnUnresolved = !!followOn && !isResolved(followOn);

    const sensedStyle = { "--sensed": color } as React.CSSProperties;

    function toggleDefer() {
        if (defer !== undefined) {
            onUpdate({ defer: undefined });
            setDeferOpen(false);
        } else {
            setDeferOpen(!deferOpen);
        }
    }

    function toggleFollowOn() {
        if (followOn !== undefined) {
            onUpdate({ followOn: undefined });
            setFollowOnOpen(false);
        } else {
            setFollowOnOpen(!followOnOpen);
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
                            : "Follow on to another checklist"
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
                <div className="vH-meta" style={sensedStyle}>
                    <span className="vH-meta-k">FOLLOW-ON</span>
                    <span className="vH-meta-v">
                        <Combobox
                            value={followOn ? nameOf(followOn) : ""}
                            options={options}
                            onChange={(name) => onUpdate({ followOn: idOf(name) })}
                            placeholder="select checklist…"
                        />
                    </span>
                </div>
            )}
        </>
    );
}
