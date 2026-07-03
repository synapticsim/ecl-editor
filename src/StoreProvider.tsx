import { type Dispatch, type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from "react";

import { migrateAppState } from "./migrations";
import { loadPersisted, savePersisted } from "./persistence";
import { type Action, DispatchContext, init, reducer, type SaveStatus, StateContext, StatusContext } from "./state";

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

    // Hydrate from IndexedDB once on mount. The persisted value isn't schema-
    // validated, so it's run through migrateAppState to normalize older shapes
    // (e.g. pre-sections data) instead of discarding them.
    useEffect(() => {
        let cancelled = false;
        loadPersisted<unknown>().then((saved) => {
            if (cancelled) return;
            const migrated = saved ? migrateAppState(saved) : null;
            if (migrated) {
                dispatch({ type: "hydrate", state: migrated });
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
