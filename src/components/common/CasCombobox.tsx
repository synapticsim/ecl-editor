import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CAS_MESSAGE_OPTIONS, casMessageLabel, MESSAGE_LEVEL_COLOR } from "../../lib/cas";
import type { CasMessage } from "../../lib/cas";
import { Icon } from "../../icons";
import "./Combobox.css";

interface Props {
    value: CasMessage | undefined;
    onChange: (value: CasMessage | undefined) => void;
    placeholder?: string;
}

interface Rect {
    top: number;
    left: number;
    width: number;
}

export function CasCombobox({ value, onChange, placeholder = "select CAS message…" }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const q = query.trim().toLowerCase();
    const filtered = q
        ? CAS_MESSAGE_OPTIONS.filter((o) => o.label.toLowerCase().includes(q))
        : CAS_MESSAGE_OPTIONS;

    function place() {
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
    }

    function openMenu() {
        place();
        setQuery("");
        setHighlight(0);
        setOpen(true);
    }
    function close() {
        setOpen(false);
        setQuery("");
    }
    function choose(msg: CasMessage | undefined) {
        onChange(msg);
        close();
    }

    useLayoutEffect(() => {
        if (!open || !listRef.current) return;
        const el = listRef.current.querySelector<HTMLElement>(".cbx-opt.hl");
        el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    useEffect(() => {
        if (!open) return;
        function onDown(e: PointerEvent) {
            const t = e.target as Node;
            if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) close();
        }
        function onScroll(e: Event) {
            if (listRef.current?.contains(e.target as Node)) return;
            place();
        }
        window.addEventListener("pointerdown", onDown, true);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("pointerdown", onDown, true);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", place);
        };
    });

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[Math.min(highlight, filtered.length - 1)];
            if (opt) choose(opt.message);
        } else if (e.key === "Escape") {
            close();
        }
    }

    const currentLabel = value !== undefined ? casMessageLabel(value) : "";
    const currentColor = value !== undefined ? MESSAGE_LEVEL_COLOR[CAS_MESSAGE_OPTIONS.find((o) => o.message === value)!.level] : undefined;

    return (
        <div className="cbx" ref={wrapRef}>
            {open ? (
                <input
                    className="cbx-input"
                    autoFocus
                    value={query}
                    placeholder={currentLabel || placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setHighlight(0);
                    }}
                    onKeyDown={onKeyDown}
                />
            ) : (
                <button className="cbx-trigger" onClick={openMenu}>
                    {currentColor && <span className="cbx-dot" style={{ background: currentColor }} />}
                    <span className={currentLabel ? "cbx-val" : "cbx-ph"}>{currentLabel || placeholder}</span>
                    <span className="cbx-caret">
                        <Icon name="chevron-down" size={11} />
                    </span>
                </button>
            )}

            {open &&
                rect &&
                createPortal(
                    <ul
                        ref={listRef}
                        className="cbx-menu"
                        style={{ top: rect.top, left: rect.left, width: rect.width }}
                    >
                        <li
                            className={`cbx-opt${value === undefined ? " sel" : ""}`}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                choose(undefined);
                            }}
                            onMouseEnter={() => setHighlight(-1)}
                        >
                            <span className="cbx-opt-label">None</span>
                            {value === undefined && (
                                <span className="cbx-check">
                                    <Icon name="check" size={11} />
                                </span>
                            )}
                        </li>
                        {filtered.length === 0 ? (
                            <li className="cbx-empty">No matches</li>
                        ) : (
                            filtered.map((opt, i) => (
                                <li
                                    key={opt.message}
                                    className={`cbx-opt${i === highlight ? " hl" : ""}${opt.message === value ? " sel" : ""}`}
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        choose(opt.message);
                                    }}
                                    onMouseEnter={() => setHighlight(i)}
                                >
                                    <span className="cbx-dot" style={{ background: MESSAGE_LEVEL_COLOR[opt.level] }} />
                                    <span className="cbx-opt-label">{opt.label}</span>
                                    {opt.message === value && (
                                        <span className="cbx-check">
                                            <Icon name="check" size={11} />
                                        </span>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>,
                    document.body,
                )}
        </div>
    );
}
