import { lazy, Suspense } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { SiteStoreProvider } from "../state/context";
import { ErrorBoundary } from "./ErrorBoundary";
import { Shell } from "./Shell";

const Threshold = lazy(() => import("../routes/threshold"));
const Atlas = lazy(() => import("../routes/atlas"));
const Legions = lazy(() => import("../routes/legions"));
const Chronicle = lazy(() => import("../routes/chronicle"));
const Muster = lazy(() => import("../routes/muster"));
const Road = lazy(() => import("../routes/road"));
const NotFound = lazy(() => import("../routes/not-found"));

export function RouteTable(): React.JSX.Element {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minBlockSize: "100vh" }} />}>
      <Routes>
        <Route path="/" element={<Threshold />} />
        <Route path="/atlas" element={<Atlas />} />
        <Route path="/legions" element={<Legions />} />
        <Route path="/chronicle" element={<Chronicle />} />
        <Route path="/muster" element={<Muster />} />
        <Route path="/road" element={<Road />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <SiteStoreProvider>
        <HashRouter>
          <Shell>
            <RouteTable />
          </Shell>
        </HashRouter>
      </SiteStoreProvider>
    </ErrorBoundary>
  );
}
