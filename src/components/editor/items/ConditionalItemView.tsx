import type { ConditionalItem } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { ItemList } from "../ItemList";
import { BlockFrame } from "./BlockFrame";

export function ConditionalItemView({ item, number }: { item: ConditionalItem; number: string }) {
    const color = ITEM_TYPE_META.conditional.cssVar;
    const prefix = `${number}.`;

    return (
        <BlockFrame item={item} number={number} color={color} pill="IF">
            <div className="vH-branch-label" style={{ "--ic": color } as React.CSSProperties}>
                <span className="vH-branch-pill">YES</span>
                <span className="vH-branch-text">Yes</span>
            </div>
            <ItemList
                items={item.paths.YES}
                loc={{ kind: "branch", parentId: item.id, key: "YES" }}
                numberPrefix={prefix}
                startAt={1}
            />
            <div className="vH-branch-label" style={{ "--ic": color } as React.CSSProperties}>
                <span className="vH-branch-pill">NO</span>
                <span className="vH-branch-text">No</span>
            </div>
            <ItemList
                items={item.paths.NO}
                loc={{ kind: "branch", parentId: item.id, key: "NO" }}
                numberPrefix={prefix}
                startAt={item.paths.YES.length + 1}
            />
        </BlockFrame>
    );
}
