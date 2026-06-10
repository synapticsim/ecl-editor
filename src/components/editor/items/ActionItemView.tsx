import type { ActionItem } from "../../../checklist";
import { useDispatch } from "../../../state";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { EditableText } from "../../common/EditableText";
import { RowFrame } from "./RowFrame";

export function ActionItemView({ item, number }: { item: ActionItem; number: string }) {
    const dispatch = useDispatch();
    const update = (patch: Partial<ActionItem>) => dispatch({ type: "update-item", itemId: item.id, patch });

    return (
        <RowFrame item={item} number={number} color={ITEM_TYPE_META.action.cssVar}>
            <div className="vH-action">
                <span className="vH-ch">
                    <EditableText value={item.challenge} onCommit={(v) => update({ challenge: v })} multiline autoSize placeholder="CHALLENGE" />
                </span>
                <span className="vH-dots" />
                <span className="vH-rs">
                    <EditableText value={item.response ?? ""} onCommit={(v) => update({ response: v })} multiline autoSize align="right" placeholder="response" />
                </span>
            </div>
            {item.extension !== undefined && item.extension !== "" && (
                <div className="vH-ext">
                    <span className="vH-ext-k">↳</span>
                    <EditableText value={item.extension} onCommit={(v) => update({ extension: v })} autoSize />
                </div>
            )}
        </RowFrame>
    );
}
