import type { Checklist, ChecklistDatabase } from "../../checklist";
import { CATEGORY_LABELS, isHeader } from "../../checklist";
import { countItems } from "../../itemUtils";
import { useDispatch } from "../../state";
import { CasCombobox } from "../common/CasCombobox";
import { EditableText } from "../common/EditableText";

function sectionFor(db: ChecklistDatabase | null, checklistId: string): string | null {
    if (!db) return null;
    for (const cat of Object.values(db.categories)) {
        let section: string | null = null;
        for (const entry of cat) {
            if (isHeader(entry)) section = entry.name;
            else if (entry.id === checklistId) return section;
        }
    }
    return null;
}

export function EditorHeader({ checklist, db }: { checklist: Checklist; db: ChecklistDatabase | null }) {
    const dispatch = useDispatch();
    const section = sectionFor(db, checklist.id);
    const total = countItems(checklist.items);

    return (
        <div className="m-head">
            <div className="m-breadcrumb mono">
                <span>{db?.name ?? "—"}</span>
                <span className="slash">›</span>
                <span>{CATEGORY_LABELS[checklist.category]}</span>
                {section && (
                    <>
                        <span className="slash">›</span>
                        <span>{section}</span>
                    </>
                )}
                <span className="slash">›</span>
                <span className="current">{checklist.name}</span>
            </div>
            <div className="m-title-row">
                <div className="m-title">
                    <EditableText
                        value={checklist.name}
                        onCommit={(name) => dispatch({ type: "set-checklist-name", id: checklist.id, name })}
                        autoSize
                    />
                </div>
                <div className="m-meta">
                    <span className="badge">{total} items</span>
                </div>
            </div>
            {(checklist.category === "non-normal" || checklist.category === "procedure") && (
                <div className="m-cas">
                    <span className="m-cas-label">CAS message</span>
                    <CasCombobox
                        value={checklist.cas}
                        onChange={(cas) => dispatch({ type: "set-checklist-cas", id: checklist.id, cas })}
                    />
                </div>
            )}
        </div>
    );
}
