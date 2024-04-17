import React, { forwardRef } from "react";

type PanelDivProps = {
  children: React.ReactNode;
  className?: string;
};

export const PanelDiv = forwardRef<HTMLDivElement, PanelDivProps>(({ children, className }, ref) => (
  <div
    className={`w-full rounded-lg border border-foreground-4 bg-gradient-to-b from-background to-background-5 ${className}`}
    ref={ref}
  >
    {children}
  </div>
));
