import type { ActionItem, ChecklistItem, NoteLevel } from "../../checklist";
import { ITEM_TYPE_META } from "../../itemUtils";

const NOTE_COLOR: Record<NoteLevel, string> = {
    note: "var(--note-level-note)",
    caution: "var(--note-level-caution)",
    warning: "var(--note-level-warning)",
};

function ActionOverlay({ item }: { item: ActionItem }) {
    const color = ITEM_TYPE_META.action.cssVar;
    const sensedStyle = { "--sensed": color } as React.CSSProperties;
    return (
        <div className="vH-row overlay" data-type="action" style={{ "--ic": color } as React.CSSProperties}>
            <span className="vH-num" />
            <span className="vH-drag">⋮⋮</span>
            <span className="vH-bar" />
            <div className="vH-body">
                <div className="vH-action">
                    <span className="vH-ch" style={{ whiteSpace: "pre", lineHeight: 1.4 }}>
                        {item.challenge}
                    </span>
                    <span className="vH-dots" />
                    <span className="vH-rs" style={{ whiteSpace: "pre", lineHeight: 1.4 }}>
                        {item.response}
                    </span>
                </div>
                {item.extension && (
                    <div className="vH-ext">
                        <span className="vH-ext-k">↳</span>
                        <span>{item.extension}</span>
                    </div>
                )}
                <div className="vH-meta" style={sensedStyle}>
                    <span className="vH-flag">LIMITATION</span>
                    <span className="vH-flag">SENSED</span>
                    <span className="vH-flag">TIMER</span>
                    <span className="vH-flag">DEFER</span>
                    <span className="vH-flag">FOLLOW-ON</span>
                </div>
                {item.sensed !== undefined && (
                    <div className="vH-meta" style={sensedStyle}>
                        <span className="vH-flag">INVERT</span>
                        <span className="vH-flag">LATCH</span>
                        <span className="vH-meta-v">—</span>
                    </div>
                )}
                {item.timer !== undefined && (
                    <div className="vH-meta" style={sensedStyle}>
                        <span className="vH-meta-k">TIMER</span>
                        <span className="vH-meta-v">{item.timer}s</span>
                    </div>
                )}
                {item.defer && (
                    <div className="vH-meta" style={sensedStyle}>
                        <span className="vH-meta-k">DEFER</span>
                        <span className="vH-meta-v">—</span>
                    </div>
                )}
                {item.followOn && (
                    <div className="vH-meta" style={sensedStyle}>
                        <span className="vH-meta-k">FOLLOW-ON</span>
                        <span className="vH-meta-v">—</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Read-only visual of an item, rendered inside the DragOverlay. */
export function ItemOverlay({ item }: { item: ChecklistItem }) {
    const color = ITEM_TYPE_META[item.type].cssVar;
    const style = { "--ic": color } as React.CSSProperties;

    if (item.type === "action") {
        return <ActionOverlay item={item} />;
    }

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

    if (item.type === "note") {
        return (
            <div className="vH-row overlay" data-type="note" style={style}>
                <span className="vH-num" />
                <span className="vH-drag">⋮⋮</span>
                <span className="vH-bar" />
                <div className="vH-body">
                    <div className="vH-note">
                        <div className="vH-note-header">
                            {(["note", "caution", "warning"] as NoteLevel[]).map((lvl) => (
                                <span
                                    key={lvl}
                                    className={`vH-note-level${item.level === lvl ? " active" : ""}`}
                                    style={{ "--note-color": NOTE_COLOR[lvl] } as React.CSSProperties}
                                >
                                    {lvl.toUpperCase()}
                                </span>
                            ))}
                        </div>
                        <div className="vH-note-text" style={{ whiteSpace: "pre", lineHeight: 1.5 }}>
                            {item.text}
                        </div>
                    </div>
                    {(item.defer || item.followOn) && (
                        <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                            {item.defer && <span className="vH-flag active">DEFER</span>}
                            {item.followOn && <span className="vH-flag active">FOLLOW-ON</span>}
                        </div>
                    )}
                    {item.defer && (
                        <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                            <span className="vH-meta-k">DEFER</span>
                            <span className="vH-meta-v">—</span>
                        </div>
                    )}
                    {item.followOn && (
                        <div className="vH-meta" style={{ "--sensed": color } as React.CSSProperties}>
                            <span className="vH-meta-k">FOLLOW-ON</span>
                            <span className="vH-meta-v">—</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const deferFollowOnStyle = { "--sensed": color } as React.CSSProperties;
    return (
        <div className="vH-row overlay" data-type={item.type} style={style}>
            <span className="vH-num" />
            <span className="vH-drag">⋮⋮</span>
            <span className="vH-bar" />
            <div className="vH-body">
                <div className="vH-text" style={{ whiteSpace: "pre", lineHeight: 1.5 }}>
                    {item.text}
                </div>
                {(item.defer || item.followOn) && (
                    <div className="vH-meta" style={deferFollowOnStyle}>
                        {item.defer && <span className="vH-flag active">DEFER</span>}
                        {item.followOn && <span className="vH-flag active">FOLLOW-ON</span>}
                    </div>
                )}
                {item.defer && (
                    <div className="vH-meta" style={deferFollowOnStyle}>
                        <span className="vH-meta-k">DEFER</span>
                        <span className="vH-meta-v">—</span>
                    </div>
                )}
                {item.followOn && (
                    <div className="vH-meta" style={deferFollowOnStyle}>
                        <span className="vH-meta-k">FOLLOW-ON</span>
                        <span className="vH-meta-v">—</span>
                    </div>
                )}
            </div>
        </div>
    );
}
