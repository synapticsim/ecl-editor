import type { MultiSelectItem } from "../../../checklist";
import { Icon } from "../../../icons";
import { useDispatch } from "../../../state";
import { EditableText } from "../../common/EditableText";
import { ItemList } from "../ItemList";
import { FollowOnRows } from "./FollowOnRows";
import { PathFollowOnToggle } from "./PathFollowOnToggle";
import { usePathFollowOn } from "./usePathFollowOn";

interface Props {
    item: MultiSelectItem;
    pathKey: string;
    color: string;
    numberPrefix: string;
    startAt: number;
    canDelete: boolean;
}

/** One multi-select option: its header row (name, copy, follow-on, delete),
 *  the option's own follow-on rows when active, and its items. Split out from
 *  MultiSelectItemView because each option needs its own usePathFollowOn
 *  hook instance, which a plain .map() callback can't provide. */
export function MultiSelectBranch({ item, pathKey, color, numberPrefix, startAt, canDelete }: Props) {
    const dispatch = useDispatch();
    const path = item.paths[pathKey];
    const followOn = usePathFollowOn(item.id, pathKey, path.followOn);
    const canCopy = path.items.length > 0 && Object.keys(item.paths).length > 1;

    return (
        <div>
            <div className="vH-branch-label" style={{ "--ic": color } as React.CSSProperties}>
                <span className="vH-branch-text">
                    <EditableText
                        value={pathKey}
                        onCommit={(next) =>
                            dispatch({ type: "rename-branch", itemId: item.id, oldKey: pathKey, newKey: next })
                        }
                        autoSize
                        commit="blur"
                    />
                </span>
                {canCopy && (
                    <button
                        className="vH-branch-copy"
                        title="Copy these items to the other options"
                        onClick={() => dispatch({ type: "copy-branch", itemId: item.id, fromKey: pathKey })}
                    >
                        <Icon name="copy" size={10} />
                    </button>
                )}
                <PathFollowOnToggle
                    active={followOn.active}
                    unresolved={followOn.unresolved}
                    color={color}
                    onClick={followOn.toggle}
                />
                {canDelete && (
                    <button
                        className="vH-branch-del"
                        title="Delete option"
                        onClick={() => dispatch({ type: "delete-branch", itemId: item.id, key: pathKey })}
                    >
                        ×
                    </button>
                )}
            </div>
            {followOn.active && (
                <div className="vH-path-followon">
                    <FollowOnRows
                        followOn={followOn.baseFollowOn}
                        extraBlank={followOn.extraBlank}
                        onAddBlank={followOn.addBlank}
                        onSetAt={followOn.setAt}
                        onRemoveAt={followOn.removeAt}
                        nameOf={followOn.nameOf}
                        options={followOn.options}
                    />
                </div>
            )}
            <ItemList
                items={path.items}
                loc={{ kind: "branch", parentId: item.id, key: pathKey }}
                numberPrefix={numberPrefix}
                startAt={startAt}
            />
        </div>
    );
}
