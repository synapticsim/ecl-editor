import { Fragment, useMemo } from "react";

import type {
    ActionItem,
    Checklist,
    ChecklistItem,
    ConditionalItem,
    FreeTextItem,
    MultiSelectItem,
    NoteItem,
} from "../../checklist";

const ROWS_PER_PAGE = 19;
const HEIGHT_PER_ROW = 46;
const CHARS_PER_ROW = 39;
const SVG_W = 740;
const LIST_Y = 170;
const SVG_H = LIST_Y + ROWS_PER_PAGE * HEIGHT_PER_ROW;

const C_WHITE = "#ffffff";
const C_BG = "#050508";
const C_SEP = "#808080";
const C_RED = "#ff0000";
const C_AMBER = "#ffe300";

const FONT = "'A22XMono', 'Courier New', monospace";
const FS = 20.25;

/* ─── Layout ──────────────────────────────────────────────────── */

interface LayoutItem {
    item: ChecklistItem;
    startRow: number;
}

function rowHeight(item: ChecklistItem, pos: number): number {
    switch (item.type) {
        case "action": {
            const ch = item.challenge.split("\n").length;
            const rh = item.response ? item.response.split("\n").length - 1 : 0;
            const cmh = item.comment ? item.comment.split("\n").length : 0;
            return ch + rh + cmh;
        }
        case "free-text":
            return item.text.split("\n").length;
        case "form-feed": {
            const p = pos % ROWS_PER_PAGE;
            return p === 0 ? 0 : ROWS_PER_PAGE - p;
        }
        case "note":
            return item.text.split("\n").length + 1;
        case "conditional":
            return item.challenge.split("\n").length + 1;
        case "multi-select":
            return item.challenge.split("\n").length + Object.keys(item.paths).length;
    }
}

function computeLayout(items: ChecklistItem[]): LayoutItem[] {
    const result: LayoutItem[] = [];
    let pos = 0;

    function visit(list: ChecklistItem[]) {
        for (const item of list) {
            const h = rowHeight(item, pos);
            const inPage = pos % ROWS_PER_PAGE;
            if (inPage > 0 && inPage + h > ROWS_PER_PAGE) {
                pos += ROWS_PER_PAGE - inPage;
            }
            result.push({ item, startRow: pos });
            pos += h;
            if (item.type === "conditional" || item.type === "multi-select") {
                Object.values(item.paths).forEach(visit);
            }
        }
    }

    visit(items);
    return result;
}

/* ─── Action line formatting ─────────────────────────────────── */

function actionLines(item: ActionItem): string[] {
    const ch = item.challenge.split("\n");
    const cm = item.comment?.split("\n").map((l) => `  ${l}`) ?? [];
    if (!item.response) return ch.concat(cm);

    const rh = item.response.split("\n");
    const cl = ch.pop()!;
    const rl = rh.shift()!;
    // ․ = "One Dot Leader", rendered as a full-width period by A22XMono
    const overlap = `${cl}${rl.padStart(CHARS_PER_ROW - cl.length, "․")}`;
    return ch
        .concat(
            overlap,
            rh.map((l) => l.padStart(CHARS_PER_ROW, " ")),
        )
        .concat(cm);
}

/* ─── SVG primitives ─────────────────────────────────────────── */

function Tick({ x, y, sensed = false }: { x: number; y: number; sensed?: boolean }) {
    const s = 28;
    return (
        <rect
            x={x}
            y={y}
            width={s}
            height={s}
            fill={sensed ? "grey" : "black"}
            stroke="#848484"
            strokeWidth={2}
            strokeLinejoin="round"
        />
    );
}

function T({
    x,
    y,
    anchor = "start",
    fill = C_WHITE,
    children,
}: {
    x: number;
    y: number;
    anchor?: "start" | "middle" | "end";
    fill?: string;
    children: string;
}) {
    return (
        <text x={x} y={y} fontSize={FS} textAnchor={anchor} fill={fill} style={{ whiteSpace: "pre", fontFamily: FONT }}>
            {children}
        </text>
    );
}

/* ─── Item renderers ─────────────────────────────────────────── */

function ActionRow({ item, baseY }: { item: ActionItem; baseY: number }) {
    const lines = actionLines(item);
    return (
        <g>
            <Tick x={12} y={baseY + 9} sensed={item.sensed !== undefined} />
            {lines.map((line, i) => (
                <T key={i} x={49} y={baseY + 33 + HEIGHT_PER_ROW * i}>
                    {line}
                </T>
            ))}
        </g>
    );
}

function FreeTextRow({ item, baseY }: { item: FreeTextItem; baseY: number }) {
    return (
        <g>
            {item.text.split("\n").map((line, i) => (
                <T key={i} x={49} y={baseY + 33 + HEIGHT_PER_ROW * i}>
                    {line}
                </T>
            ))}
        </g>
    );
}

function NoteRow({ item, baseY }: { item: NoteItem; baseY: number }) {
    const lines = item.text.split("\n");
    const borderColor = item.level === "warning" ? C_RED : item.level === "caution" ? C_AMBER : C_WHITE;
    return (
        <g>
            <Tick x={12} y={baseY + 9} />
            <rect x={260} y={baseY + 10} width={194} height={35} fill="none" stroke={borderColor} strokeWidth={2} />
            <T x={357} y={baseY + 38} anchor="middle">
                {item.level.toUpperCase()}
            </T>
            {lines.map((line, i) => (
                <T key={i} x={49} y={baseY + 33 + HEIGHT_PER_ROW * (i + 1)}>
                    {line}
                </T>
            ))}
        </g>
    );
}

function RadioCircle({ cx, cy }: { cx: number; cy: number }) {
    return <circle cx={cx} cy={cy} r={11} fill="black" stroke="#848484" strokeWidth={2} />;
}

function RadioLabel({ cx, cy, label }: { cx: number; cy: number; label: string }) {
    return (
        <text x={cx + 11 + 10} y={cy} fontFamily={FONT} fontSize={FS} fill={C_WHITE} dominantBaseline="central">
            {label}
        </text>
    );
}

function ConditionalRow({ item, baseY }: { item: ConditionalItem; baseY: number }) {
    const challengeLines = item.challenge.split("\n");
    const radioY = baseY + challengeLines.length * HEIGHT_PER_ROW + 23;
    return (
        <g>
            {challengeLines.map((line, i) => (
                <T key={i} x={49} y={baseY + 33 + HEIGHT_PER_ROW * i}>
                    {line}
                </T>
            ))}
            <RadioCircle cx={222} cy={radioY} />
            <RadioLabel cx={222} cy={radioY} label="YES" />
            <RadioCircle cx={469} cy={radioY} />
            <RadioLabel cx={469} cy={radioY} label="NO" />
        </g>
    );
}

function MultiSelectRow({ item, baseY }: { item: MultiSelectItem; baseY: number }) {
    const challengeLines = item.challenge.split("\n");
    const optionBaseY = baseY + challengeLines.length * HEIGHT_PER_ROW;
    return (
        <g>
            {challengeLines.map((line, i) => (
                <T key={i} x={49} y={baseY + 33 + HEIGHT_PER_ROW * i}>
                    {line}
                </T>
            ))}
            {Object.keys(item.paths).map((label, i) => {
                const cy = optionBaseY + 23 + HEIGHT_PER_ROW * i;
                return (
                    <g key={i}>
                        <RadioCircle cx={98} cy={cy} />
                        <RadioLabel cx={98} cy={cy} label={label} />
                    </g>
                );
            })}
        </g>
    );
}

/* ─── Page SVG ────────────────────────────────────────────────── */

function Page({ name, items }: { name: string; items: LayoutItem[] }) {
    const titleLines = name.split("\n");

    return (
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: "block" }}>
            <rect width={SVG_W} height={SVG_H} fill={C_BG} />

            {titleLines.map((line, i) => (
                <T key={i} x={SVG_W / 2} y={100 + 28 * i} anchor="middle">
                    {line}
                </T>
            ))}

            <line x1={6} x2={734} y1={168} y2={168} stroke={C_SEP} strokeWidth={2} strokeLinecap="round" />

            {items.map(({ item, startRow }, i) => {
                const baseY = LIST_Y + (startRow % ROWS_PER_PAGE) * HEIGHT_PER_ROW;
                if (item.type === "action") return <ActionRow key={i} item={item} baseY={baseY} />;
                if (item.type === "free-text") return <FreeTextRow key={i} item={item} baseY={baseY} />;
                if (item.type === "note") return <NoteRow key={i} item={item} baseY={baseY} />;
                if (item.type === "conditional") return <ConditionalRow key={i} item={item} baseY={baseY} />;
                if (item.type === "multi-select") return <MultiSelectRow key={i} item={item} baseY={baseY} />;
                return null;
            })}
        </svg>
    );
}

/* ─── Main export ─────────────────────────────────────────────── */

export function ChecklistRenderer({ checklist }: { checklist: Checklist }) {
    const layout = useMemo(() => computeLayout(checklist.items), [checklist.items]);

    const pages = useMemo((): LayoutItem[][] => {
        if (layout.length === 0) return [[]];
        const map = new Map<number, LayoutItem[]>();
        let max = 0;
        for (const li of layout) {
            const p = Math.floor(li.startRow / ROWS_PER_PAGE);
            if (p > max) max = p;
            const bucket = map.get(p);
            if (bucket) bucket.push(li);
            else map.set(p, [li]);
        }
        return Array.from({ length: max + 1 }, (_, p) => map.get(p) ?? []);
    }, [layout]);

    return (
        <div className="ecl-renderer">
            {pages.map((pageItems, p) => (
                <Fragment key={p}>
                    {p > 0 && <hr className="ecl-page-sep" />}
                    <Page name={checklist.name} items={pageItems} />
                </Fragment>
            ))}
        </div>
    );
}
