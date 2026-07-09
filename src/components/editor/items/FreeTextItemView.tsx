import type { FreeTextItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { useDispatch } from "../../../state";
import { EditableText } from "../../common/EditableText";
import { DeferFollowOn } from "./DeferFollowOn";
import { RowFrame } from "./RowFrame";

export function FreeTextItemView({ item, number }: { item: FreeTextItem; number: string }) {
    const dispatch = useDispatch();
    const update = (patch: Partial<FreeTextItem>) => dispatch({ type: "update-item", itemId: item.id, patch });
    const color = ITEM_TYPE_META["free-text"].cssVar;

    return (
        <RowFrame item={item} number={number} color={color}>
            <div className="vH-text">
                <EditableText
                    value={item.text}
                    onCommit={(v) => update({ text: v })}
                    multiline
                    autoSize
                    placeholder="Free text…"
                />
            </div>
            <DeferFollowOn defer={item.defer} followOn={item.followOn} color={color} onUpdate={update} />
        </RowFrame>
    );
}
