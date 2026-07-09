import type { ActionItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
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

    return (
        <RowFrame item={item} number={number} color={ITEM_TYPE_META.action.cssVar}>
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
            <div className="vH-meta" style={{ "--sensed": ITEM_TYPE_META.action.cssVar } as React.CSSProperties}>
                <button
                    className={`vH-flag${item.limitation ? " active" : ""}`}
                    title="Flag as a limitation"
                    onClick={() => update({ limitation: !item.limitation })}
                >
                    LIMITATION
                </button>
            </div>
            <div className="vH-meta" style={{ "--sensed": ITEM_TYPE_META.action.cssVar } as React.CSSProperties}>
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
            <div className="vH-meta" style={{ "--sensed": ITEM_TYPE_META.action.cssVar } as React.CSSProperties}>
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
