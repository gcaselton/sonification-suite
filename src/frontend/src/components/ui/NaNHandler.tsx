import {
  Box,
  Field,
  HStack,
  Input,
  RadioCard,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { InfoTip } from "./ToggleTip";

export type NanStrategy = "drop" | "interpolate" | "fill";

interface NaNHandlerProps {
  strategy: NanStrategy;
  onStrategyChange: (strategy: NanStrategy) => void;
  fillValue: string;
  onFillValueChange: (value: string) => void;
}

const nanStrategyCards = [
  {
    value: "drop" as const,
    title: "Drop rows",
    description: "Remove any row with a missing value in a selected column.",
  },
  {
    value: "interpolate" as const,
    title: "Interpolate",
    description: "Estimate missing numeric values from surrounding rows.",
  },
  {
    value: "fill" as const,
    title: "Fill with value",
    description: "Replace missing values with a fixed value.",
  },
];

export default function NaNHandler({
  strategy,
  onStrategyChange,
  fillValue,
  onFillValueChange,
}: NaNHandlerProps) {
  return (
    <Box animation="fade-in 300ms ease-out">
      <HStack mb="2">
        <Text fontWeight="bold">Missing values</Text>
        <InfoTip
          content="One or more selected columns contain missing values. Choose how they should be handled before sonifying."
          positioning={{ placement: "right" }}
        />
      </HStack>

      <RadioCard.Root
        value={strategy}
        colorPalette="teal"
        onValueChange={(e) => onStrategyChange(e.value as NanStrategy)}
      >
        <Stack gap="2">
          {nanStrategyCards.map((card) => (
            <RadioCard.Item key={card.value} value={card.value}>
              <RadioCard.ItemHiddenInput />

              <RadioCard.ItemControl>
                <RadioCard.ItemContent>
                  <RadioCard.ItemText>{card.title}</RadioCard.ItemText>

                  <RadioCard.ItemDescription>
                    {card.description}
                  </RadioCard.ItemDescription>
                </RadioCard.ItemContent>

                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          ))}
        </Stack>
      </RadioCard.Root>

      {strategy === "fill" && (
        <Field.Root width="auto" mt="3">
          <Field.Label>Fill value</Field.Label>

          <Input
            value={fillValue}
            onBlur={(e) => onFillValueChange(e.target.value)}
            width="150px"
          />
        </Field.Root>
      )}
    </Box>
  );
}
