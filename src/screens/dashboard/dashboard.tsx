import { cn } from "@/lib/utils";
import { CredentialsForm } from "./credentials-form";
import { FileBrowser } from "./file-browser";
import { useDashboardContext } from "./use-dashboard-context";

export function Dashboard() {
  const { connection } = useDashboardContext();

  return (
    <div className="flex h-full w-full">
      <div
        className={cn(
          "flex min-w-64 shrink-0 flex-col",
          !connection && "mx-auto w-full max-w-1/2",
        )}
      >
        <CredentialsForm />
      </div>

      {connection && <FileBrowser />}
    </div>
  );
}
