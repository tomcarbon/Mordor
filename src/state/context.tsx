import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createSiteStore } from "./store";
import type { SiteState, SiteStore } from "./store";

const StoreContext = createContext<SiteStore | null>(null);

export function SiteStoreProvider(props: { store?: SiteStore; children: ReactNode }): React.JSX.Element {
  const [store] = useState(() => props.store ?? createSiteStore());
  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>;
}

export function useSiteStore(): SiteStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useSiteStore must be used inside SiteStoreProvider");
  return store;
}

/** `select` must return a primitive, so unrelated changes do not re-render. */
export function useSiteState<T>(select: (s: SiteState) => T): T {
  const store = useSiteStore();
  return useSyncExternalStore(store.subscribe, () => select(store.getSnapshot()));
}
