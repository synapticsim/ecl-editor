import type { ChecklistItem } from "../../checklist";
import { ITEM_TYPE_META } from "../../itemUtils";

/** Read-only visual of an item, rendered inside the DragOverlay. */
export function ItemOverlay({ item }: { item: ChecklistItem }) {
    const color = ITEM_TYPE_META[item.type].cssVar;
    const style = { "--ic": color } as React.CSSProperties;

    if (item.type === "conditional" || item.type === "multi-select") {
        return (
            <div className="vH-block overlay" data-type={item.type} style={style}>
                <div className="vH-block-head">
                    <span className="vH-num" />
                    <span className="vH-drag">⋮⋮</span>
                    <span className="vH-bar" />
                    <div className="vH-block-prompt">
                        <span className="vH-block-pill">{item.type === "conditional" ? "IF" : "SELECT"}</span>
                        <span>{item.challenge}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (item.type === "form-feed") {
        return (
            <div className="vH-ff overlay" style={style}>
                <span className="vH-num" />
                <span className="vH-drag">⋮⋮</span>
                <span className="vH-bar" />
                <span className="vH-ff-content">
                    <span className="vH-ff-line" />
                    <span className="vH-ff-label">page break</span>
                    <span className="vH-ff-line" />
                </span>
            </div>
        );
    }

    return (
        <div className="vH-row overlay" data-type={item.type} style={style}>
            <span className="vH-num" />
            <span className="vH-drag">⋮⋮</span>
            <span className="vH-bar" />
            <div className="vH-body">
                {item.type === "free-text" ? (
                    <div className="vH-text">{item.text}</div>
                ) : (
                    <div className="vH-action">
                        <span className="vH-ch">{item.challenge}</span>
                        <span className="vH-dots" />
                        <span className="vH-rs">{item.response}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
