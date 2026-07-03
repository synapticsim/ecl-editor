import type { Category, Checklist, ChecklistDatabase, Phase, Section } from "../../checklist";
import { CATEGORY_LABELS, PHASE_LABELS } from "../../checklist";
import { countItems } from "../../itemUtils";
import { useDispatch } from "../../state";
import { CasCombobox } from "../common/CasCombobox";
import { Combobox } from "../common/Combobox";
import { EditableText } from "../common/EditableText";

const PHASE_OPTIONS = Object.values(PHASE_LABELS);

export function EditorHeader({
    checklist,
    db,
    category,
    section,
}: {
    checklist: Checklist;
    db: ChecklistDatabase | null;
    category: Category | null;
    section: Section | null;
}) {
    const dispatch = useDispatch();
    const total = countItems(checklist.items);

    return (
        <div className="m-head">
            <div className="m-breadcrumb mono">
                <span>{db?.name ?? "—"}</span>
                <span className="slash">›</span>
                <span>{category && CATEGORY_LABELS[category]}</span>
                {section && (
                    <>
                        <span className="slash">›</span>
                        <span>{section.name}</span>
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
                        multiline
                    />
                </div>
                <div className="m-meta">
                    <span className="badge">{total} items</span>
                </div>
            </div>
            {category === "non_normal" && (
                <div className="m-cas">
                    <span className="m-cas-label">CAS message</span>
                    <CasCombobox
                        value={checklist.cas}
                        onChange={(cas) => dispatch({ type: "set-checklist-cas", id: checklist.id, cas })}
                    />
                </div>
            )}
            {category === "normal" && (
                <div className="m-cas">
                    <span className="m-cas-label">Phase</span>
                    <Combobox
                        value={checklist.phase ? PHASE_LABELS[checklist.phase] : ""}
                        options={PHASE_OPTIONS}
                        onChange={(label) => {
                            const entry = (Object.entries(PHASE_LABELS) as [Phase, string][]).find(
                                ([, l]) => l === label,
                            );
                            dispatch({ type: "set-checklist-phase", id: checklist.id, phase: entry?.[0] });
                        }}
                        placeholder="select phase…"
                    />
                </div>
            )}
        </div>
    );
}
