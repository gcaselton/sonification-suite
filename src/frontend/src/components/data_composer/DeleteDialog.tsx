import { Button, Dialog, Portal, Text } from "@chakra-ui/react";

interface DeleteDialogProps {
  open: boolean;
  layerLabel: string | null;
  dependentLabels: string[];
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteDialog({
  open,
  layerLabel,
  dependentLabels,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />

        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete {layerLabel}?</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <Text>
                <strong>{dependentLabels.join(", ")}</strong>{" "}
                {dependentLabels.length === 1 ? "reuses" : "reuse"} this layer's
                dataset. Deleting <strong>{layerLabel}</strong> will clear their data selection
                and they'll need to be reconfigured before you can continue.
              </Text>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>

              <Button colorPalette="red" onClick={onConfirm}>
                Delete layer
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
