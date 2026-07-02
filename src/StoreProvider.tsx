import { type Dispatch, type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from "react";

import { loadPersisted, savePersisted } from "./persistence";
import {
    type Action,
    type AppState,
    DispatchContext,
    init,
    reducer,
    type SaveStatus,
    StateContext,
    StatusContext,
} from "./state";

export function StoreProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, undefined, init);
    const [status, setStatus] = useState<SaveStatus>("saved");
    const loaded = useRef(false);

    // Mark "saving" immediately on any user-triggered change; the debounced
    // effect below performs the write and flips back to "saved".
    const trackedDispatch = useCallback<Dispatch<Action>>((action) => {
        setStatus("saving");
        dispatch(action);
    }, []);

    // Hydrate from IndexedDB once on mount.
    useEffect(() => {
        let cancelled = false;
        loadPersisted<AppState>().then((saved) => {
            if (cancelled) return;
            if (saved && Array.isArray(saved.databases)) {
                dispatch({ type: "hydrate", state: saved });
            }
            loaded.current = true;
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Persist (debounced) whenever state changes after the initial load.
    useEffect(() => {
        if (!loaded.current) return;
        const handle = setTimeout(() => {
            savePersisted(state)
                .then(() => setStatus("saved"))
                .catch(() => setStatus("saved"));
        }, 500);
        return () => clearTimeout(handle);
    }, [state]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={trackedDispatch}>
                <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
            </DispatchContext.Provider>
        </StateContext.Provider>
    );
}
