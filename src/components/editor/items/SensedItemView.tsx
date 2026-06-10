import type { SensedItem } from "../../../checklist";
import { ECL_VARIABLE_NAMES } from "../../../checklist";
import { useDispatch } from "../../../state";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { EditableText } from "../../common/EditableText";
import { Combobox } from "../../common/Combobox";
import { RowFrame } from "./RowFrame";

export function SensedItemView({ item, number }: { item: SensedItem; number: string }) {
    const dispatch = useDispatch();
    const update = (patch: Partial<SensedItem>) => dispatch({ type: "update-item", itemId: item.id, patch });
    // Show the current value even if it isn't (or no longer is) a known ECL variable.
    const options =
        item.sensed && !ECL_VARIABLE_NAMES.includes(item.sensed)
            ? [item.sensed, ...ECL_VARIABLE_NAMES]
            : ECL_VARIABLE_NAMES;

    return (
        <RowFrame item={item} number={number} color={ITEM_TYPE_META.sensed.cssVar}>
            <div className="vH-action">
                <span className="vH-ch">
                    <EditableText value={item.challenge} onCommit={(v) => update({ challenge: v })} multiline autoSize placeholder="CHALLENGE" />
                </span>
                <span className="vH-dots" />
                <span className="vH-rs">
                    <EditableText value={item.response ?? ""} onCommit={(v) => update({ response: v })} multiline autoSize align="right" placeholder="response" />
                </span>
            </div>
            <div className="vH-meta" style={{ "--sensed": ITEM_TYPE_META.sensed.cssVar } as React.CSSProperties}>
                <span className="vH-meta-k">sensed_var</span>
                <span className="vH-meta-eq">=</span>
                <span className="vH-meta-v">
                    <Combobox
                        value={item.sensed}
                        options={options}
                        onChange={(v) => update({ sensed: v })}
                        placeholder="select variable…"
                    />
                </span>
            </div>
        </RowFrame>
    );
}
