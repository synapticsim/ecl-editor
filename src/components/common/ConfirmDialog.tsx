import { type ReactNode, useCallback, useEffect, useState } from "react";
import "./ConfirmDialog.css";
import { ConfirmContext, type ConfirmOptions } from "./confirmContext";

interface Pending {
    opts: ConfirmOptions;
    resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<Pending | null>(null);

    const confirm = useCallback(
        (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
        [],
    );

    function settle(result: boolean) {
        pending?.resolve(result);
        setPending(null);
    }

    useEffect(() => {
        if (!pending) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") settle(false);
            if (e.key === "Enter") settle(true);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {pending && (
                <div className="modal-backdrop" onClick={() => settle(false)}>
                    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">{pending.opts.title}</div>
                        <div className="modal-msg">{pending.opts.message}</div>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => settle(false)}>
                                Cancel
                            </button>
                            <button className="modal-btn danger" onClick={() => settle(true)}>
                                {pending.opts.confirmLabel ?? "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
