import { ThemeToggle } from "./components/theme-toggle";
import { Dashboard } from "./screens/dashboard/dashboard";
import { DashboardProvider } from "./screens/dashboard/use-dashboard-context";

/**
 * We'll probably need a router here at some point
 */
export function App() {
  return (
    <main className="flex h-screen w-screen">
      <DashboardProvider>
        <Dashboard />
      </DashboardProvider>

      <div className="absolute bottom-4 left-4">
        <ThemeToggle />
      </div>
    </main>
  );
}
