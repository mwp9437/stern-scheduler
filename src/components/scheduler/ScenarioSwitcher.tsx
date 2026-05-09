import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scenario } from "@/hooks/useScenarios";

interface ScenarioSwitcherProps {
  scenarios: Scenario[];
  activeId: string | undefined;
  isLoading: boolean;
  createScenario: (name: string) => Promise<Scenario>;
  duplicateScenario: (sourceId: string, newName: string) => Promise<Scenario>;
  renameScenario: (id: string, newName: string) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
}

const MAX_NAME_LEN = 60;

function suggestCopyName(baseName: string, existing: Set<string>): string {
  let name = `${baseName} (copy)`;
  let n = 2;
  while (existing.has(name)) {
    name = `${baseName} (copy ${n})`;
    n++;
  }
  return name;
}

export function ScenarioSwitcher({
  scenarios,
  activeId,
  isLoading,
  createScenario,
  duplicateScenario,
  renameScenario,
  deleteScenario,
  setActive,
}: ScenarioSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = scenarios.find((s) => s.id === activeId);
  const existingNames = new Set(scenarios.map((s) => s.name));
  const onlyOne = scenarios.length <= 1;

  // Reset input + submitting on dialog close
  useEffect(() => {
    if (!createOpen && !duplicateOpen && !renameOpen) {
      setNameInput("");
      setSubmitting(false);
    }
  }, [createOpen, duplicateOpen, renameOpen]);

  const trimmed = nameInput.trim();
  const validName =
    trimmed.length > 0 && trimmed.length <= MAX_NAME_LEN;

  const openCreate = () => {
    setNameInput("");
    setCreateOpen(true);
  };

  const openDuplicate = () => {
    if (!active) return;
    setNameInput(suggestCopyName(active.name, existingNames));
    setDuplicateOpen(true);
  };

  const openRename = () => {
    if (!active) return;
    setNameInput(active.name);
    setRenameOpen(true);
  };

  const handleCreate = async () => {
    if (!validName) return;
    setSubmitting(true);
    try {
      await createScenario(trimmed);
      setCreateOpen(false);
    } catch {
      // Toast surfaced by hook; keep dialog open so user can retry.
      setSubmitting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!validName || !active) return;
    setSubmitting(true);
    try {
      await duplicateScenario(active.id, trimmed);
      setDuplicateOpen(false);
    } catch {
      setSubmitting(false);
    }
  };

  const handleRename = async () => {
    if (!validName || !active) return;
    if (trimmed === active.name) {
      setRenameOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      await renameScenario(active.id, trimmed);
      setRenameOpen(false);
    } catch {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    try {
      await deleteScenario(active.id);
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleSwitch = (id: string) => {
    if (id !== activeId) {
      void setActive(id);
    }
  };

  if (isLoading || !active) {
    return (
      <Button variant="outline" size="sm" disabled>
        <span className="text-muted-foreground">Loading…</span>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[200px]">
            <span className="truncate">{active.name}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuRadioGroup value={activeId} onValueChange={handleSwitch}>
            {scenarios.map((s) => (
              <DropdownMenuRadioItem key={s.id} value={s.id}>
                <span className="truncate">{s.name}</span>
                {s.id === activeId && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New scenario…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate "{active.name}"
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename "{active.name}"…
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            disabled={onlyOne}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete "{active.name}"…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New scenario"
        description="Create a new schedule scenario you can switch to from the menu."
        confirmLabel="Create"
        value={nameInput}
        onChange={setNameInput}
        onSubmit={handleCreate}
        canSubmit={validName && !submitting}
      />

      <NameDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title={`Duplicate "${active.name}"`}
        description="Copies all courses and custom events into a new scenario."
        confirmLabel="Duplicate"
        value={nameInput}
        onChange={setNameInput}
        onSubmit={handleDuplicate}
        canSubmit={validName && !submitting}
      />

      <NameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={`Rename "${active.name}"`}
        description="Pick a new name for this scenario."
        confirmLabel="Save"
        value={nameInput}
        onChange={setNameInput}
        onSubmit={handleRename}
        canSubmit={validName && !submitting}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{active.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the scenario and all of its courses and
              custom events. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  value,
  onChange,
  onSubmit,
  canSubmit,
}: NameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="scenario-name">Scenario name</Label>
          <Input
            id="scenario-name"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={MAX_NAME_LEN}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
