import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { FileType } from "./object-list";

interface CreateFolderButtonProps {
  onSubmit: (folderName: string) => void;
  objects: { type: FileType; label: string }[];
}

export function CreateFolderButton({
  onSubmit,
  objects,
}: CreateFolderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formSchema = z
    .object({
      folderName: z.string().nonempty("Folder name is required"),
    })
    .refine(
      (args) => {
        const folderWithNameExists = objects.some(
          (object) =>
            object.type === "folder" && object.label === args.folderName,
        );

        return !folderWithNameExists;
      },
      {
        path: ["folderName"],
        message: "A folder with this name already exists",
      },
    );

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      folderName: "",
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(_isOpen) => {
        setIsOpen(_isOpen);
        reset();
      }}
    >
      <DialogTrigger>
        <Button variant="ghost">Create Folder</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
          <DialogDescription>
            This will create an empty folder with the chosen folder name.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(({ folderName }) => {
            setIsOpen(false);
            onSubmit(folderName);
            reset();
          })}
          className="space-y-8"
        >
          <FormField hasError={!!errors.folderName}>
            <label htmlFor="folderName">Folder name</label>

            <Input
              placeholder="e.g. Documents"
              id="folderName"
              {...register("folderName")}
            />

            <FormField.Error>{errors.folderName?.message}</FormField.Error>
          </FormField>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
