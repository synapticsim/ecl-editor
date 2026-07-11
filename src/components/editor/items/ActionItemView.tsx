import { useState } from "react";

import type { ActionItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { ECL_VARIABLE_NAMES, varIndex, varName } from "../../../lib/vars";
import { allChecklists, useDispatch, useSelectedChecklist } from "../../../state";
import { Combobox } from "../../common/Combobox";
import { EditableText } from "../../common/EditableText";
import { RowFrame } from "./RowFrame";

export function ActionItemView({ item, number }: { item: ActionItem; number: string }) {
    const dispatch = useDispatch();
    const { checklist, db } = useSelectedChecklist();
    const update = (patch: Partial<ActionItem>) => dispatch({ type: "update-item", itemId: item.id, patch });

    const [deferOpen, setDeferOpen] = useState(!!item.defer);
    const [followOnOpen, setFollowOnOpen] = useState(!!item.followOn);
    const [timerOpen, setTimerOpen] = useState(item.timer !== undefined);
    const [commentOpen, setCommentOpen] = useState(item.comment !== undefined);

    const otherChecklists = db ? allChecklists(db).filter((cl) => cl.id !== checklist?.id) : [];
    const nameOf = (id: string) => otherChecklists.find((cl) => cl.id === id)?.name ?? id;
    const isResolved = (id: string) => otherChecklists.some((cl) => cl.id === id);
    const idOf = (name: string) => otherChecklists.find((cl) => cl.name === name)?.id;
    const options = otherChecklists.map((cl) => cl.name);

    const currentVarName = item.sensed !== undefined ? varName(item.sensed) : undefined;
    const unknownVarLabel =
        item.sensed !== undefined && currentVarName === undefined ? `#${item.sensed} (unknown)` : null;
    const varOptions = unknownVarLabel ? [unknownVarLabel, ...ECL_VARIABLE_NAMES] : ECL_VARIABLE_NAMES;

    const color = ITEM_TYPE_META.action.cssVar;

    const deferActive = !!item.defer || deferOpen;
    const followOnActive = !!item.followOn || followOnOpen;
    const timerActive = item.timer !== undefined || timerOpen;
    const commentActive = item.comment !== undefined || commentOpen;

    const deferUnresolved = !!item.defer && !isResolved(item.defer);
    const followOnUnresolved = !!item.followOn && !isResolved(item.followOn);

    function toggleDefer() {
        if (item.defer !== undefined) {
            update({ defer: undefined });
            setDeferOpen(false);
        } else {
            setDeferOpen(!deferOpen);
        }
    }

    function toggleFollowOn() {
        if (item.followOn !== undefined) {
            update({ followOn: undefined });
            setFollowOnOpen(false);
        } else {
            setFollowOnOpen(!followOnOpen);
        }
    }

    function toggleTimer() {
        if (item.timer !== undefined) {
            update({ timer: undefined });
            setTimerOpen(false);
        } else {
            setTimerOpen(!timerOpen);
        }
    }

    function toggleComment() {
        if (item.comment !== undefined) {
            update({ comment: undefined });
            setCommentOpen(false);
        } else {
            setCommentOpen(!commentOpen);
        }
    }

    return (
        <RowFrame item={item} number={number} color={color}>
            <div className="vH-action">
                <span className="vH-ch">
                    <EditableText
                        value={item.challenge}
                        onCommit={(v) => update({ challenge: v })}
                        multiline
                        autoSize
                        placeholder="CHALLENGE"
                    />
                </span>
                <span className="vH-dots" />
                <span className="vH-rs">
                    <EditableText
                        value={item.response ?? ""}
                        onCommit={(v) => update({ response: v })}
                        multiline
                        autoSize
                        align="right"
                        placeholder="response"
                    />
                </span>
            </div>
            <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                <button
                    className={`vH-flag${item.limitation ? " active" : ""}`}
                    title="Flag as a limitation"
                    onClick={() => update({ limitation: !item.limitation })}
                >
                    LIMITATION
                </button>
                <button
                    className={`vH-flag${item.sensed !== undefined ? " active" : ""}`}
                    title="Link to an ECL variable for automatic sensing"
                    onClick={() => update({ sensed: item.sensed !== undefined ? undefined : 0 })}
                >
                    SENSED
                </button>
                <button
                    className={`vH-flag${timerActive ? " active" : ""}`}
                    title="Set a countdown timer in seconds"
                    onClick={toggleTimer}
                >
                    TIMER
                </button>
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
                <button
                    className={`vH-flag${commentActive ? " active" : ""}`}
                    title="Add a comment"
                    onClick={toggleComment}
                >
                    COMMENT
                </button>
            </div>
            {item.sensed !== undefined && (
                <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                    <button
                        className={`vH-flag${item.inverted ? " active" : ""}`}
                        title="Invert the sensed condition"
                        onClick={() => update({ inverted: !item.inverted })}
                    >
                        INVERT
                    </button>
                    <button
                        className={`vH-flag${item.latchable ? " active" : ""}`}
                        title="Latch once sensed"
                        onClick={() => update({ latchable: !item.latchable })}
                    >
                        LATCH
                    </button>
                    <span className="vH-meta-v">
                        <Combobox
                            value={currentVarName ?? unknownVarLabel ?? ""}
                            options={varOptions}
                            onChange={(v) => {
                                const idx = varIndex(v);
                                if (idx !== undefined) update({ sensed: idx });
                            }}
                            placeholder="select variable…"
                        />
                    </span>
                </div>
            )}
            {timerActive && (
                <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                    <span className="vH-meta-k">TIMER</span>
                    <span className="vH-meta-v">
                        <input
                            className="vH-timer-input"
                            type="number"
                            min={1}
                            value={item.timer ?? ""}
                            autoFocus={item.timer === undefined}
                            onChange={(e) => {
                                const v = Number.parseInt(e.target.value, 10);
                                update({ timer: Number.isNaN(v) || v <= 0 ? undefined : v });
                            }}
                        />
                    </span>
                    <span className="vH-meta-unit">s</span>
                </div>
            )}
            {deferActive && (
                <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                    <span className="vH-meta-k">DEFER</span>
                    <span className="vH-meta-v">
                        <Combobox
                            value={item.defer ? nameOf(item.defer) : ""}
                            options={options}
                            onChange={(name) => update({ defer: idOf(name) })}
                            placeholder="select checklist…"
                        />
                    </span>
                </div>
            )}
            {followOnActive && (
                <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                    <span className="vH-meta-k">FOLLOW-ON</span>
                    <span className="vH-meta-v">
                        <Combobox
                            value={item.followOn ? nameOf(item.followOn) : ""}
                            options={options}
                            onChange={(name) => update({ followOn: idOf(name) })}
                            placeholder="select checklist…"
                        />
                    </span>
                </div>
            )}
            {commentActive && (
                <EditableText
                    value={item.comment ?? ""}
                    onCommit={(v) => update({ comment: v || undefined })}
                    multiline
                    autoSize
                    placeholder="Comment…"
                    className="vH-comment"
                />
            )}
        </RowFrame>
    );
}
