import { useLayoutEffect, useRef, useState } from "react";
import "./EditableText.css";

interface Props {
    value: string;
    onCommit: (next: string) => void;
    placeholder?: string;
    className?: string;
    /** textarea instead of input (allows line breaks) */
    multiline?: boolean;
    /** size an inline field to its content (input width, or field-sizing for textareas) */
    autoSize?: boolean;
    align?: "left" | "right";
    /** "live" commits on every keystroke; "blur" commits on blur (e.g. map keys) */
    commit?: "live" | "blur";
}

export function EditableText({
    value,
    onCommit,
    placeholder,
    className = "",
    multiline = false,
    autoSize = false,
    align = "left",
    commit = "live",
}: Props) {
    const live = commit === "live";
    const [draft, setDraft] = useState(value);
    const [lastValue, setLastValue] = useState(value);
    const taRef = useRef<HTMLTextAreaElement>(null);

    // Re-sync the draft when the committed value changes externally.
    if (lastValue !== value) {
        setLastValue(value);
        setDraft(value);
    }

    const current = live ? value : draft;

    // Height auto-grow so the field gets taller as line breaks are added.
    useLayoutEffect(() => {
        if (multiline && taRef.current) {
            taRef.current.style.height = "auto";
            taRef.current.style.height = `${taRef.current.scrollHeight}px`;
        }
    }, [current, multiline]);

    function change(next: string) {
        setDraft(next);
        if (live) onCommit(next);
    }
    function blur() {
        if (!live && draft !== value) onCommit(draft);
    }

    if (multiline) {
        return (
            <textarea
                ref={taRef}
                className={`edit ${autoSize ? "inline" : "area"} ${align === "right" ? "rs" : ""} ${className}`}
                value={current}
                placeholder={placeholder}
                rows={1}
                onChange={(e) => change(e.target.value)}
                onBlur={blur}
                onKeyDown={(e) => {
                    if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
                }}
            />
        );
    }

    return (
        <input
            className={`edit ${align === "right" ? "rs" : ""} ${className}`}
            value={current}
            placeholder={placeholder}
            size={autoSize ? Math.max(current.length || (placeholder?.length ?? 1), 1) : undefined}
            onChange={(e) => change(e.target.value)}
            onBlur={blur}
            onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") (e.target as HTMLInputElement).blur();
            }}
        />
    );
}
