import { cn } from "@/lib/utils";
import { PropsWithChildren, ReactNode } from "react";

interface FormFieldProps extends PropsWithChildren {
  className?: string;
  hasError?: boolean;
}

export function FormField({ children, className, hasError }: FormFieldProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 [&>[data-error]]:hidden",
        className,
        hasError &&
          "[&>[data-error]]:flex [&>[data-select]]:border-rose-200/70 [&>input]:border-rose-200/70",
      )}
    >
      {children}
    </div>
  );
}

interface ErrorProps {
  children: ReactNode;
}

function Error({ children }: ErrorProps) {
  return (
    <div
      className={cn("w-fit rounded bg-rose-50 px-2 py-1 text-sm text-rose-400")}
      data-error
    >
      {children}
    </div>
  );
}

FormField.Error = Error;
