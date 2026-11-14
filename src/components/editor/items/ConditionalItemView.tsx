import type { ConditionalItem } from "../../../checklist";
import { Icon } from "../../../icons";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { useDispatch } from "../../../state";
import { ItemList } from "../ItemList";
import { BlockFrame } from "./BlockFrame";
import { FollowOnRows } from "./FollowOnRows";
import { PathFollowOnToggle } from "./PathFollowOnToggle";
import { usePathFollowOn } from "./usePathFollowOn";

export function ConditionalItemView({ item, number }: { item: ConditionalItem; number: string }) {
    const dispatch = useDispatch();
    const color = ITEM_TYPE_META.conditional.cssVar;
    const prefix = `${number}.`;

    const yes = usePathFollowOn(item.id, "YES", item.paths.YES.followOn);
    const no = usePathFollowOn(item.id, "NO", item.paths.NO.followOn);

    return (
        <BlockFrame item={item} number={number} color={color} pill="IF">
            <div className="vH-branch-label" style={{ "--ic": color } as React.CSSProperties}>
                <span className="vH-branch-text">Yes</span>
                {item.paths.YES.items.length > 0 && (
                    <button
                        className="vH-branch-copy"
                        title="Copy these items to the No branch"
                        onClick={() => dispatch({ type: "copy-branch", itemId: item.id, fromKey: "YES" })}
                    >
                        <Icon name="copy" size={10} />
                    </button>
                )}
                <PathFollowOnToggle
                    active={yes.active}
                    unresolved={yes.unresolved}
                    color={color}
                    onClick={yes.toggle}
                />
            </div>
            {yes.active && (
                <div className="vH-path-followon">
                    <FollowOnRows
                        followOn={yes.baseFollowOn}
                        extraBlank={yes.extraBlank}
                        onAddBlank={yes.addBlank}
                        onSetAt={yes.setAt}
                        onRemoveAt={yes.removeAt}
                        nameOf={yes.nameOf}
                        options={yes.options}
                    />
                </div>
            )}
            <ItemList
                items={item.paths.YES.items}
                loc={{ kind: "branch", parentId: item.id, key: "YES" }}
                numberPrefix={prefix}
                startAt={1}
            />
            <div className="vH-branch-label" style={{ "--ic": color } as React.CSSProperties}>
                <span className="vH-branch-text">No</span>
                {item.paths.NO.items.length > 0 && (
                    <button
                        className="vH-branch-copy"
                        title="Copy these items to the Yes branch"
                        onClick={() => dispatch({ type: "copy-branch", itemId: item.id, fromKey: "NO" })}
                    >
                        <Icon name="copy" size={10} />
                    </button>
                )}
                <PathFollowOnToggle active={no.active} unresolved={no.unresolved} color={color} onClick={no.toggle} />
            </div>
            {no.active && (
                <div className="vH-path-followon">
                    <FollowOnRows
                        followOn={no.baseFollowOn}
                        extraBlank={no.extraBlank}
                        onAddBlank={no.addBlank}
                        onSetAt={no.setAt}
                        onRemoveAt={no.removeAt}
                        nameOf={no.nameOf}
                        options={no.options}
                    />
                </div>
            )}
            <ItemList
                items={item.paths.NO.items}
                loc={{ kind: "branch", parentId: item.id, key: "NO" }}
                numberPrefix={prefix}
                startAt={item.paths.YES.items.length + 1}
            />
        </BlockFrame>
    );
}
