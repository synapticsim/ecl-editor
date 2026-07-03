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
    /** Multiline only: show a read-only preview clamped to this many lines, each
     *  individually ellipsized if it overflows, until clicked — then swap to a
     *  textarea where line breaks are only inserted explicitly (Shift+Enter);
     *  plain Enter commits and exits editing, and lines never auto-wrap. */
    clampLines?: number;
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
    clampLines,
}: Props) {
    const live = commit === "live";
    const [draft, setDraft] = useState(value);
    const [lastValue, setLastValue] = useState(value);
    const [editing, setEditing] = useState(!clampLines);
    const taRef = useRef<HTMLTextAreaElement>(null);

    // Re-sync the draft when the committed value changes externally.
    if (lastValue !== value) {
        setLastValue(value);
        setDraft(value);
    }

    const current = live ? value : draft;

    // Height auto-grow so the field gets taller as line breaks are added. Also
    // re-runs when `editing` flips true so a textarea swapping in from the
    // clamped preview immediately reflects its (possibly multi-line) content
    // instead of sitting at its default single-line height until the next edit.
    useLayoutEffect(() => {
        if (multiline && taRef.current) {
            taRef.current.style.height = "auto";
            taRef.current.style.height = `${taRef.current.scrollHeight}px`;
        }
    }, [current, multiline, editing]);

    // Focus the textarea as soon as it swaps in from the clamped preview.
    useLayoutEffect(() => {
        if (clampLines && editing) taRef.current?.focus();
    }, [clampLines, editing]);

    function change(next: string) {
        setDraft(next);
        if (live) onCommit(next);
    }
    function blur() {
        if (!live && draft !== value) onCommit(draft);
        if (clampLines) setEditing(false);
    }

    if (clampLines && !editing) {
        const lines = value.split("\n");
        const visible = lines.slice(0, clampLines);
        const hasMore = lines.length > clampLines;
        return (
            <div
                className={`edit-clamp ${className}`}
                tabIndex={0}
                onClick={() => setEditing(true)}
                onFocus={() => setEditing(true)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditing(true);
                    }
                }}
            >
                {value ? (
                    visible.map((line, i) => (
                        <div key={i} className="edit-clamp-line">
                            {line}
                            {hasMore && i === visible.length - 1 ? "…" : ""}
                        </div>
                    ))
                ) : (
                    <span className="edit-ph">{placeholder}</span>
                )}
            </div>
        );
    }

    if (multiline) {
        return (
            <textarea
                ref={taRef}
                className={`edit ${clampLines ? "pre" : autoSize ? "inline" : "area"} ${align === "right" ? "rs" : ""} ${className}`}
                value={current}
                placeholder={placeholder}
                rows={1}
                onChange={(e) => change(e.target.value)}
                onBlur={blur}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        (e.target as HTMLTextAreaElement).blur();
                    } else if (clampLines && e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        (e.target as HTMLTextAreaElement).blur();
                    }
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
