import type { FreeTextItem } from "../../../checklist";
import { useDispatch } from "../../../state";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { EditableText } from "../../common/EditableText";
import { RowFrame } from "./RowFrame";

export function FreeTextItemView({ item, number }: { item: FreeTextItem; number: string }) {
    const dispatch = useDispatch();
    return (
        <RowFrame item={item} number={number} color={ITEM_TYPE_META["free-text"].cssVar}>
            <div className="vH-text">
                <EditableText
                    value={item.text}
                    onCommit={(v) => dispatch({ type: "update-item", itemId: item.id, patch: { text: v } })}
                    multiline
                    autoSize
                    placeholder="Free text…"
                />
            </div>
        </RowFrame>
    );
}
