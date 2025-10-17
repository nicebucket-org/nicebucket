import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteObjectsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  objectKeys: string[];
  type?: "file" | "folder";
}

export function DeleteObjectsDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  objectKeys,
  type = "file",
}: DeleteObjectsDialogProps) {
  const objectCount = objectKeys.length;
  const isMultiple = objectCount > 1;
  const isFolder = type === "folder";

  const itemName = `${type}${isMultiple ? "s" : ""}`;
  const title = `Delete ${isMultiple ? `${String(objectCount)} ${itemName}` : itemName}`;

  const getDescription = () => {
    if (isMultiple) {
      return `Are you sure you want to delete these ${String(objectCount)} ${itemName}? This action cannot be undone.`;
    }

    const displayName = isFolder
      ? (objectKeys[0]?.replace(/\/$/, "") ?? `this ${itemName}`)
      : (objectKeys[0] ?? `this ${itemName}`);

    return `Are you sure you want to delete ${displayName}? This action cannot be undone.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete {itemName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
