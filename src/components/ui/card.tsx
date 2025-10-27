import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({
  className,
  children,
  ...other
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...other}
      className={cn(
        "border-muted flex flex-col rounded-lg border p-6 shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}
