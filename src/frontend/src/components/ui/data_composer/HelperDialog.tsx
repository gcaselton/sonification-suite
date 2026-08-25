import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Text,
  VStack,
  Icon,
} from "@chakra-ui/react";

import { LuInfo } from "react-icons/lu";

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
        <Dialog.Content maxH="95vh">
          <Dialog.Header>
            <Dialog.Title>How Data Composer works</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body overflowY="auto">
            <VStack align="start" gap={4}>
              <Text>
                Data Composer lets you build a sonification from multiple
                layers, each with its own dataset and style - similar to adding
                several plots to the same figure.
              </Text>

              <Box>
                <Text fontWeight="bold" mb="1">
                  1. Add a layer
                </Text>

                <Text color="fg.muted">
                  Each layer needs a CSV dataset. You can upload a new file, or
                  reuse a dataset already used by another layer.
                </Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb="1">
                  2. Refine the data
                </Text>

                <Text color="fg.muted">
                  Optionally refine a layer's data by choosing the relevant
                  columns and rows, and choosing how to treat missing values (if
                  they are present in your data).
                </Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb="1">
                  3. Style your layer
                </Text>

                <Text color="fg.muted">
                  Configure your own style settings, or use a preset style.
                  Click the{" "}
                  <LuInfo
                    size={16}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      margin: "0 3px",
                    }}
                  />{" "}
                  icon on a preset to see how your columns will be styled.
                </Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb="1">
                  4. Sonify
                </Text>

                <Text color="fg.muted">
                  On the final step, set a duration for the whole composition.
                  Every layer's data will stretch or compress to fit that
                  duration, so layers play in sync regardless of how much data
                  each one has.
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
