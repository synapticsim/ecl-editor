import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "../../icons";
import "./Combobox.css";

interface Props {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    placeholder?: string;
}

interface Rect {
    top: number;
    left: number;
    width: number;
}

export function Combobox({ value, options, onChange, placeholder = "select…" }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const q = query.trim().toLowerCase();
    const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

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
    function choose(opt: string) {
        onChange(opt);
        close();
    }

    // Keep the highlighted option scrolled into view.
    useLayoutEffect(() => {
        if (!open || !listRef.current) return;
        const el = listRef.current.querySelector<HTMLElement>(".cbx-opt.hl");
        el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    // Close on outside interaction; reposition on scroll/resize.
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
            if (opt) choose(opt);
        } else if (e.key === "Escape") {
            close();
        }
    }

    return (
        <div className="cbx" ref={wrapRef}>
            {open ? (
                <input
                    className="cbx-input"
                    autoFocus
                    value={query}
                    placeholder={value || placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setHighlight(0);
                    }}
                    onKeyDown={onKeyDown}
                />
            ) : (
                <button className="cbx-trigger" onClick={openMenu}>
                    <span className={value ? "cbx-val" : "cbx-ph"}>{value || placeholder}</span>
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
                        {filtered.length === 0 ? (
                            <li className="cbx-empty">No matches</li>
                        ) : (
                            filtered.map((opt, i) => (
                                <li
                                    key={opt}
                                    className={`cbx-opt${i === highlight ? " hl" : ""}${opt === value ? " sel" : ""}`}
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        choose(opt);
                                    }}
                                    onMouseEnter={() => setHighlight(i)}
                                >
                                    <span className="cbx-opt-label">{opt}</span>
                                    {opt === value && (
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
