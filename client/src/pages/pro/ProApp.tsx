import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import ProLayout from "./ProLayout";
import { ProRoleProvider } from "./components/useProRole";
import ProUpgradeScreen from "./components/ProUpgradeScreen";
import { ProTeamProvider } from "./components/ProTeamContext";
import { useProEntitlement } from "./hooks/useProEntitlement";
import { useAuth } from "@/hooks/useAuth";
import { ProDeepLinkRedirect } from "./components/ProDeepLinkRedirect";
import "./pro-theme.css";

const ProDashboard = lazy(() => import("./ProDashboard"));
const ProRoster = lazy(() => import("./ProRoster"));
const ProTraining = lazy(() => import("./ProTraining"));
const ProMatchDay = lazy(() => import("./ProMatchDay"));
const ProInventory = lazy(() => import("./ProInventory"));
const ProSchedule = lazy(() => import("./ProSchedule"));
const ProStats = lazy(() => import("./ProStats"));
const ProComms = lazy(() => import("./ProComms"));
const ProRecruitment = lazy(() => import("./ProRecruitment"));
const ProClub = lazy(() => import("./ProClub"));
const ProSettings = lazy(() => import("./ProSettings"));
const ProApprovals = lazy(() => import("./ProApprovals"));
const ProActivity = lazy(() => import("./ProActivity"));
const ProTournament = lazy(() => import("./ProTournament"));

function ProLoading({ embedded }: { embedded?: boolean }) {
  const body = (
    <div className="pro-loading-screen" role="status" aria-live="polite">
      <div className="pro-loading-screen__ring" aria-hidden />
      <span className="pro-loading-screen__label">Loading Pro</span>
    </div>
  );
  if (embedded) return body;
  return (
    <div className="pro-app">
      <div className="pro-cinematic-ambient" aria-hidden />
      {body}
    </div>
  );
}

function ProEntitlementShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError, refetch } = useProEntitlement();

  if (authLoading) return <ProLoading />;

  if (!user) {
    return <ProUpgradeScreen needsLogin />;
  }

  if (isLoading) return <ProLoading />;
  if (isError) {
    return (
      <div className="pro-app">
        <div className="pro-cinematic-ambient" aria-hidden />
        <div className="pro-loading-screen" style={{ minHeight: "50vh" }}>
          <p style={{ color: "var(--pro-danger)", fontWeight: 600, margin: 0 }}>Could not verify your Pro subscription.</p>
          <button type="button" className="pro-btn pro-btn--secondary pro-btn--sm" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!data?.active) {
    return <ProUpgradeScreen needsLogin={!!data?.unauthorized} />;
  }
  return (
    <>
      <ProDeepLinkRedirect />
      {children}
    </>
  );
}

export default function ProApp() {
  return (
    <ProRoleProvider>
      <ProTeamProvider>
        <ProEntitlementShell>
          <ProLayout>
            <Suspense fallback={<ProLoading embedded />}>
              <Switch>
                <Route path="/pro" component={ProDashboard} />
                <Route path="/pro/roster" component={ProRoster} />
                <Route path="/pro/training" component={ProTraining} />
                <Route path="/pro/match-day" component={ProMatchDay} />
                <Route path="/pro/tournament/:id" component={ProTournament} />
                <Route path="/pro/tournament" component={ProTournament} />
                <Route path="/pro/inventory" component={ProInventory} />
                <Route path="/pro/schedule" component={ProSchedule} />
                <Route path="/pro/stats" component={ProStats} />
                <Route path="/pro/comms" component={ProComms} />
                <Route path="/pro/recruitment" component={ProRecruitment} />
                <Route path="/pro/club" component={ProClub} />
                <Route path="/pro/approvals" component={ProApprovals} />
                <Route path="/pro/activity" component={ProActivity} />
                <Route path="/pro/settings" component={ProSettings} />
                <Route>
                  <div className="pro-empty">
                    <div className="pro-empty__title">Page not found</div>
                    <div className="pro-empty__desc">This Pro route does not exist.</div>
                  </div>
                </Route>
              </Switch>
            </Suspense>
          </ProLayout>
        </ProEntitlementShell>
      </ProTeamProvider>
    </ProRoleProvider>
  );
}
