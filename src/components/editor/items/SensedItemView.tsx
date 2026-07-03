import type { SensedItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { ECL_VARIABLE_NAMES, varIndex, varName } from "../../../lib/vars";
import { useDispatch } from "../../../state";
import { Combobox } from "../../common/Combobox";
import { EditableText } from "../../common/EditableText";
import { RowFrame } from "./RowFrame";

export function SensedItemView({ item, number }: { item: SensedItem; number: string }) {
    const dispatch = useDispatch();
    const update = (patch: Partial<SensedItem>) => dispatch({ type: "update-item", itemId: item.id, patch });

    const currentName = item.sensed !== undefined ? varName(item.sensed) : undefined;
    // Show the current value even if it isn't (or no longer is) a known ECL variable.
    const unknownLabel = item.sensed !== undefined && currentName === undefined ? `#${item.sensed} (unknown)` : null;
    const options = unknownLabel ? [unknownLabel, ...ECL_VARIABLE_NAMES] : ECL_VARIABLE_NAMES;

    return (
        <RowFrame item={item} number={number} color={ITEM_TYPE_META.sensed.cssVar}>
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
            <div className="vH-meta" style={{ "--sensed": ITEM_TYPE_META.sensed.cssVar } as React.CSSProperties}>
                <span className="vH-meta-v">
                    <Combobox
                        value={currentName ?? unknownLabel ?? ""}
                        options={options}
                        onChange={(v) => {
                            const idx = varIndex(v);
                            if (idx !== undefined) update({ sensed: idx });
                        }}
                        placeholder="select variable…"
                    />
                </span>
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
            </div>
        </RowFrame>
    );
}
