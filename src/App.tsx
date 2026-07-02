import { useEffect, useRef, useState } from "react";

import { ConfirmProvider } from "./components/common/ConfirmDialog";
import { Editor } from "./components/editor/Editor";
import { Preview } from "./components/preview/Preview";
import { Sidebar } from "./components/sidebar/Sidebar";
import { TopBar } from "./components/TopBar";
import { StoreProvider } from "./StoreProvider";

const LEFT_MIN = 200;
const LEFT_MAX = 480;
const RIGHT_MIN = 300;
const RIGHT_MAX = 720;
const MIDDLE_MIN = 480; // keep in sync with the grid's minmax(480px, 1fr)

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

export default function App() {
    const [leftW, setLeftW] = useState(268);
    const [rightW, setRightW] = useState(420);
    const [resizing, setResizing] = useState(false);
    const appRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ side: "l" | "r"; startX: number; startLeft: number; startRight: number } | null>(null);

    // Apply the global resize cursor / text-selection lock while dragging a handle.
    useEffect(() => {
        if (!resizing) return;
        const prevCursor = document.body.style.cursor;
        const prevSelect = document.body.style.userSelect;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        return () => {
            document.body.style.cursor = prevCursor;
            document.body.style.userSelect = prevSelect;
        };
    }, [resizing]);

    // Keep both panes within bounds when the window itself is resized smaller.
    useEffect(() => {
        function onResize() {
            const containerW = appRef.current?.clientWidth ?? window.innerWidth;
            setLeftW((l) => clamp(l, LEFT_MIN, Math.min(LEFT_MAX, containerW - MIDDLE_MIN - rightW)));
            setRightW((r) => clamp(r, RIGHT_MIN, Math.min(RIGHT_MAX, containerW - MIDDLE_MIN - leftW)));
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [leftW, rightW]);

    function onPointerDown(side: "l" | "r", e: React.PointerEvent) {
        e.preventDefault();
        drag.current = { side, startX: e.clientX, startLeft: leftW, startRight: rightW };
        setResizing(true);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    }
    function onPointerMove(e: PointerEvent) {
        const d = drag.current;
        if (!d) return;
        // Clamp against the *visible* container width so a handle can never be
        // dragged past the point where the middle pane hits its min — otherwise
        // the grid overflows and the handle drifts into the editor while the
        // opposite pane stops growing.
        const containerW = appRef.current?.clientWidth ?? window.innerWidth;
        const dx = e.clientX - d.startX;
        if (d.side === "l") {
            const maxLeft = Math.min(LEFT_MAX, containerW - MIDDLE_MIN - d.startRight);
            setLeftW(clamp(d.startLeft + dx, LEFT_MIN, maxLeft));
        } else {
            const maxRight = Math.min(RIGHT_MAX, containerW - MIDDLE_MIN - d.startLeft);
            setRightW(clamp(d.startRight - dx, RIGHT_MIN, maxRight));
        }
    }
    function onPointerUp() {
        drag.current = null;
        setResizing(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
    }

    return (
        <StoreProvider>
            <ConfirmProvider>
                <div
                    ref={appRef}
                    className="app"
                    style={{ gridTemplateColumns: `${leftW}px minmax(${MIDDLE_MIN}px, 1fr) ${rightW}px` }}
                >
                    <TopBar />
                    <Sidebar />
                    <Editor />
                    <Preview />
                    <div
                        className="resizer resizer-l"
                        style={{ left: leftW }}
                        onPointerDown={(e) => onPointerDown("l", e)}
                    />
                    <div
                        className="resizer resizer-r"
                        style={{ right: rightW }}
                        onPointerDown={(e) => onPointerDown("r", e)}
                    />
                </div>
            </ConfirmProvider>
        </StoreProvider>
    );
}
