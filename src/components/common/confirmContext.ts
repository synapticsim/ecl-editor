import { createContext, type ReactNode, useContext } from "react";

export interface ConfirmOptions {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    /** "danger" (default) styles the confirm button red; "normal" is for non-destructive confirmations. */
    tone?: "danger" | "normal";
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
    return ctx;
}
