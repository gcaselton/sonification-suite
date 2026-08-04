import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Text,
  VStack,
} from "@chakra-ui/react";

interface HelperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelperDialog({
  open,
  onOpenChange,
}: HelperDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
    >
      <Dialog.Backdrop />

      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>How Data Composer works</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="start" gap={4}>
              <Text>
                Data Composer lets you build a sonification from multiple
                layers, each with its own dataset and style — similar to adding
                several plots to the same figure.
              </Text>

              <Box>
                <Text fontWeight="bold" mb="1">
                  1. Add a layer
                </Text>

                <Text color="fg.muted">
                  Each layer needs a CSV dataset. You can upload a new file, or
                  reuse a dataset already used by another layer — handy for
                  comparing two datasets side by side.
                </Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb="1">
                  2. Refine and style each layer
                </Text>

                <Text color="fg.muted">
                  Optionally refine a layer's data, then choose a style — the
                  instrument, sound, and how each column maps to sound (pitch,
                  volume, and so on).
                </Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb="1">
                  3. Sonify
                </Text>

                <Text color="fg.muted">
                  On the final step, set a duration for the whole composition.
                  Every layer's data will stretch or compress to fit that
                  duration, so layers play in sync regardless of how much data
                  each one has. You can also balance and mute individual layers
                  before generating.
                </Text>
              </Box>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer justifyContent="center">
            <Button colorPalette="teal" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </Dialog.Footer>

          <Dialog.CloseTrigger asChild>
            <CloseButton size="sm" />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
