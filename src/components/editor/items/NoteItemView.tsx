import type { NoteItem, NoteLevel } from "../../../checklist";
import { ITEM_TYPE_META } from "../../../itemUtils";
import { useDispatch } from "../../../state";
import { EditableText } from "../../common/EditableText";
import { DeferFollowOn } from "./DeferFollowOn";
import { RowFrame } from "./RowFrame";

const LEVEL_COLOR: Record<NoteLevel, string> = {
    note: "var(--note-level-note)",
    caution: "var(--note-level-caution)",
    warning: "var(--note-level-warning)",
};

const LEVELS: NoteLevel[] = ["note", "caution", "warning"];

export function NoteItemView({ item, number }: { item: NoteItem; number: string }) {
    const dispatch = useDispatch();
    const update = (patch: Partial<NoteItem>) => dispatch({ type: "update-item", itemId: item.id, patch });
    const color = ITEM_TYPE_META.note.cssVar;

    return (
        <RowFrame item={item} number={number} color={color}>
            <div className="vH-note">
                <div className="vH-note-header">
                    {LEVELS.map((lvl) => (
                        <button
                            key={lvl}
                            className={`vH-note-level${item.level === lvl ? " active" : ""}`}
                            style={{ "--note-color": LEVEL_COLOR[lvl] } as React.CSSProperties}
                            onClick={() => update({ level: lvl })}
                        >
                            {lvl.toUpperCase()}
                        </button>
                    ))}
                </div>
                <EditableText
                    value={item.text}
                    onCommit={(v) => update({ text: v })}
                    multiline
                    autoSize
                    placeholder="Note text…"
                    className="vH-note-text"
                />
            </div>
            <DeferFollowOn defer={item.defer} followOn={item.followOn} color={color} onUpdate={update} />
        </RowFrame>
    );
}
