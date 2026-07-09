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
            {item.extension !== undefined && item.extension !== "" && (
                <div className="vH-ext">
                    <span className="vH-ext-k">↳</span>
                    <EditableText value={item.extension} onCommit={(v) => update({ extension: v })} autoSize />
                </div>
            )}
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
                {item.sensed !== undefined && (
                    <>
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
                    </>
                )}
            </div>
            {item.sensed !== undefined && (
                <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
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
            <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                <span className="vH-meta-k">TIMER</span>
                <span className="vH-meta-v">
                    <input
                        className="vH-timer-input"
                        type="number"
                        min={1}
                        value={item.timer ?? ""}
                        placeholder="off"
                        onChange={(e) => {
                            const v = Number.parseInt(e.target.value, 10);
                            update({ timer: Number.isNaN(v) || v <= 0 ? undefined : v });
                        }}
                    />
                </span>
                {item.timer !== undefined && <span className="vH-meta-unit">s</span>}
            </div>
            <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                <span className="vH-meta-k">DEFER</span>
                {item.defer && !isResolved(item.defer) && (
                    <span className="vH-meta-warn" title="Referenced checklist not found in this package">
                        ⚠
                    </span>
                )}
                <span className="vH-meta-v">
                    <Combobox
                        value={item.defer ? nameOf(item.defer) : ""}
                        options={options}
                        onChange={(name) => update({ defer: idOf(name) })}
                        placeholder="none"
                    />
                </span>
                {item.defer && (
                    <button className="vH-meta-clear" title="Clear defer" onClick={() => update({ defer: undefined })}>
                        ×
                    </button>
                )}
            </div>
            <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                <span className="vH-meta-k">FOLLOW-ON</span>
                {item.followOn && !isResolved(item.followOn) && (
                    <span className="vH-meta-warn" title="Referenced checklist not found in this package">
                        ⚠
                    </span>
                )}
                <span className="vH-meta-v">
                    <Combobox
                        value={item.followOn ? nameOf(item.followOn) : ""}
                        options={options}
                        onChange={(name) => update({ followOn: idOf(name) })}
                        placeholder="none"
                    />
                </span>
                {item.followOn && (
                    <button
                        className="vH-meta-clear"
                        title="Clear follow-on"
                        onClick={() => update({ followOn: undefined })}
                    >
                        ×
                    </button>
                )}
            </div>
        </RowFrame>
    );
}
