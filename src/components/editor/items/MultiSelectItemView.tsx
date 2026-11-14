import type { MultiSelectItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { useDispatch } from "../../../state";
import { BlockFrame } from "./BlockFrame";
import { MultiSelectBranch } from "./MultiSelectBranch";

export function MultiSelectItemView({ item, number }: { item: MultiSelectItem; number: string }) {
    const dispatch = useDispatch();
    const color = ITEM_TYPE_META["multi-select"].cssVar;
    const prefix = `${number}.`;
    const keys = Object.keys(item.paths);
    const canDelete = keys.length > 1;

    let startAt = 1;

    return (
        <BlockFrame item={item} number={number} color={color} pill="SELECT">
            {keys.map((key) => {
                const at = startAt;
                startAt += item.paths[key].items.length;
                return (
                    <MultiSelectBranch
                        key={key}
                        item={item}
                        pathKey={key}
                        color={color}
                        numberPrefix={prefix}
                        startAt={at}
                        canDelete={canDelete}
                    />
                );
            })}
            <button className="vH-branch-add" onClick={() => dispatch({ type: "add-branch", itemId: item.id })}>
                + Add option
            </button>
        </BlockFrame>
    );
}
