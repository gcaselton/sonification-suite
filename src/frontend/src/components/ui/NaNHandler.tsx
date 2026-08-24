import {
  Box,
  createListCollection,
  Field,
  HStack,
  Input,
  Portal,
  RadioCard,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import { InfoTip } from "./ToggleTip";

export type NanStrategy = "silence" | "interpolate" | "fill";

interface NaNHandlerProps {
  strategy: NanStrategy;
  onStrategyChange: (strategy: NanStrategy) => void;
  fillWith: string;
  onFillWithChange: (value: string) => void;
}

const nanStrategyCards = [
  {
    value: "silence" as const,
    title: "Silence",
    description: "Audio will go silent on these values, allowing you to hear the gaps in data.",
  },
  {
    value: "interpolate" as const,
    title: "Interpolate",
    description: "Estimate missing numbers from surrounding rows.",
  },
  {
    value: "fill" as const,
    title: "Fill with...",
    description: "Replace missing numbers with a value from the same column.",
  },
];

const fillOptions = createListCollection({
  items: [
    { label: "Minimum", value: "min" },
    { label: "Maximum", value: "max" },
    { label: "Mean", value: "mean" },
    { label: "Median", value: "median" },
    { label: "Mode", value: "mode" },
  ],
});

export default function NaNHandler({
  strategy,
  onStrategyChange,
  fillWith,
  onFillWithChange,
}: NaNHandlerProps) {
  return (
    <Box animation="fade-in 300ms ease-out">
      <HStack mb="2">
        <Text fontWeight="bold">Missing values</Text>
        <InfoTip
          content="One or more columns contain missing values. Choose how they should be handled before sonifying."
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

                  {card.value === "fill" && strategy === "fill" && (
                    <Select.Root
                      animation="fade-in 300ms ease-out"
                      mt="3"
                      collection={fillOptions}
                      value={[fillWith]}
                      onValueChange={(e) => onFillWithChange(e.value[0])}
                      width="220px"
                    >
                      <Select.HiddenSelect />

                      <Select.Control>
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Select.IndicatorGroup>
                          <Select.Indicator />
                        </Select.IndicatorGroup>
                      </Select.Control>

                      <Portal>
                        <Select.Positioner>
                          <Select.Content>
                            {fillOptions.items.map((option) => (
                              <Select.Item item={option} key={option.value}>
                                {option.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  )}
                </RadioCard.ItemContent>

                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          ))}
        </Stack>
      </RadioCard.Root>
    </Box>
  );
}
