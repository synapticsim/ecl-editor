import { Icon } from "../../../icons";
import { Combobox } from "../../common/Combobox";

interface Props {
    /** Real, resolved follow-on ids — never includes the pending blank row. */
    followOn: string[];
    /** Whether a pending, not-yet-resolved extra row should show. */
    extraBlank: boolean;
    onAddBlank: () => void;
    onSetAt: (index: number, name: string) => void;
    onRemoveAt: (index: number) => void;
    nameOf: (id: string) => string;
    options: string[];
}

/** One row per follow-on target, vertically stacked, plus a compact icon
 *  button to add another. Shared by DeferFollowOn (item-level) and
 *  PathFollowOn (branch-level) so both render identically. */
export function FollowOnRows({ followOn, extraBlank, onAddBlank, onSetAt, onRemoveAt, nameOf, options }: Props) {
    const showExtra = extraBlank || followOn.length === 0;
    const rows = showExtra ? [...followOn, ""] : followOn;

    return (
        <>
            {rows.map((id, i) => (
                <div className="vH-meta" key={i}>
                    <span className="vH-meta-k">FOLLOW-ON</span>
                    <span className="vH-meta-v vH-followon-name">
                        <Combobox
                            value={id ? nameOf(id) : ""}
                            options={options}
                            onChange={(name) => onSetAt(i, name)}
                            placeholder="select checklist…"
                        />
                    </span>
                    {followOn.length > 0 && (
                        <button className="vH-branch-del" title="Remove" onClick={() => onRemoveAt(i)}>
                            ×
                        </button>
                    )}
                    {i === rows.length - 1 && (
                        <button className="vH-followon-add" title="Add another follow-on" onClick={onAddBlank}>
                            <Icon name="plus" size={10} />
                        </button>
                    )}
                </div>
            ))}
        </>
    );
}
