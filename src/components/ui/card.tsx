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
        "flex flex-col rounded-lg border border-neutral-300 p-6 shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}
