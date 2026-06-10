import type { MultiSelectItem } from "../../../checklist";
import { useDispatch } from "../../../state";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { EditableText } from "../../common/EditableText";
import { ItemList } from "../ItemList";
import { BlockFrame } from "./BlockFrame";

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
                const list = item.paths[key];
                const at = startAt;
                startAt += list.length;
                return (
                    <div key={key}>
                        <div className="vH-branch-label" style={{ "--ic": color } as React.CSSProperties}>
                            <span className="vH-branch-pill">OPT</span>
                            <span className="vH-branch-text">
                                <EditableText
                                    value={key}
                                    onCommit={(next) =>
                                        dispatch({ type: "rename-branch", itemId: item.id, oldKey: key, newKey: next })
                                    }
                                    autoSize
                                    commit="blur"
                                />
                            </span>
                            {canDelete && (
                                <button
                                    className="vH-branch-del"
                                    title="Delete option"
                                    onClick={() => dispatch({ type: "delete-branch", itemId: item.id, key })}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <ItemList
                            items={list}
                            loc={{ kind: "branch", parentId: item.id, key }}
                            numberPrefix={prefix}
                            startAt={at}
                        />
                    </div>
                );
            })}
            <button className="vH-branch-add" onClick={() => dispatch({ type: "add-branch", itemId: item.id })}>
                + Add option
            </button>
        </BlockFrame>
    );
}
