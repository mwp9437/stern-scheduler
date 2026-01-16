import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <footer className="border-t border-border bg-muted/50 px-6 py-2 relative">
      {!isCollapsed && (
        <div className="text-center space-y-1 pr-8">
          <p className="text-sm text-muted-foreground">
            If you enjoyed Stern Scheduler please consider making a donation to my sixth annual Pan-Mass Challenge
            fundraiser for the Dana-Farber Cancer Institute via venmo{" "}
            <span className="font-medium text-foreground">@mikepezza</span> or via{" "}
            <a
              href="https://profile.pmc.org/MP0430"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              my PMC profile
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground">
            Want to build your own project? Try{" "}
            <a
              href="https://lovable.dev/invite/NSCSC9O"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Lovable
            </a>
            .
          </p>
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
      >
        {isCollapsed ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </footer>
  );
}
