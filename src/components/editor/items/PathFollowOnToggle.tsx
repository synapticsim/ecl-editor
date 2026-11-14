interface Props {
    active: boolean;
    unresolved: boolean;
    color: string;
    onClick: () => void;
}

/** Follow-on toggle for a branch — sits inline among the branch header's
 *  other controls (copy/delete) instead of on its own line. */
export function PathFollowOnToggle({ active, unresolved, color, onClick }: Props) {
    return (
        <button
            className={`vH-flag${active ? " active" : ""}${unresolved ? " warn" : ""}`}
            style={{ "--sensed": color } as React.CSSProperties}
            title={unresolved ? "Follow-on checklist not found in this package" : "Follow on when this branch is taken"}
            onClick={onClick}
        >
            FOLLOW-ON{unresolved && " ⚠"}
        </button>
    );
}
