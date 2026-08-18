import {
  Box,
  Button,
  CloseButton,
  Dialog,
  List,
  Text,
  VStack,
  Icon,
} from "@chakra-ui/react";

import { LuInfo } from "react-icons/lu";

interface SpecHelperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SpecHelper({ open, onOpenChange }: SpecHelperProps) {
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
            <Dialog.Title>What is a spectrogram?</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body overflowY="auto">
            <VStack align="start" gap={4}>
              <Text>
                A spectrogram is a visual picture of sound. It shows three
                things at the same time on one graph: how{" "}
                <strong>frequency</strong> (pitch) and <strong>loudness</strong>{" "}
                (amplitude) change as <strong>time</strong> goes by.
              </Text>

              <Text fontWeight="bold" textStyle='md'>How to Read a Spectrogram</Text>

              <List.Root gap={2}>
                <List.Item>
                  <strong>Horizontal Axis (X-axis): </strong>shows{" "}
                  <strong>time</strong> moving from left to right.
                </List.Item>
                <List.Item>
                  <strong>Vertical Axis (Y-axis): </strong>shows{" "}
                  <strong>frequency</strong> or pitch, with low sounds at the
                  bottom and high sounds at the top.
                </List.Item>
                <List.Item>
                  <strong>Colours and Brightness: </strong>show the{" "}
                  <strong>amplitude</strong> or loudness.
                  Bright colours (like white and yellow) mean the sound is
                  loud at that frequency, while dark or cool colours (like black/blue)
                  mean it is quiet or absent.
                </List.Item>
              </List.Root>
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
