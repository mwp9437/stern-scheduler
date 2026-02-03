import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VISIT_KEY = "stern_scheduler_visit_count";

function shouldShowModal(count: number): boolean {
  if (count === 2 || count === 5 || count === 10) return true;
  if (count > 10 && count % 10 === 0) return true;
  return false;
}

export function FundraiserModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Increment visit count on mount (once per session/page load)
    const storedCount = localStorage.getItem(VISIT_KEY);
    const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
    const newCount = currentCount + 1;
    localStorage.setItem(VISIT_KEY, newCount.toString());

    // Check if we should show the modal
    if (shouldShowModal(newCount)) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>A Quick Note from the Creator</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            If you are enjoying Stern Scheduler, please consider making a donation to my
            sixth annual Pan-Mass Challenge fundraiser for the Dana-Farber Cancer Institute.
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                window.open("https://profile.pmc.org/MP0430", "_blank");
                setIsOpen(false);
              }}
            >
              Donate via PMC
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Maybe Later
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center w-full">
            Or via Venmo <span className="font-medium text-foreground">@mikepezza</span>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
