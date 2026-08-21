import {
  Box,
  Button,
  CheckboxCard,
  Field,
  Image,
  Icon,
  Link,
  Text,
  Flex,
  NumberInput,
  VStack,
  Stack,
  RadioCard,
  HStack,
} from "@chakra-ui/react";

import { RefineMenuProps } from "./RefineMenu";
import { useState, useEffect } from "react";
import LoadingMessage from "../ui/LoadingMessage";
import ErrorMsg from "../ui/ErrorMsg";
import { constellationsAPI } from "../../apiConfig";
import { apiRequest } from "../../utils/requests";
import { InfoTip } from "../ui/ToggleTip";
import { Tooltip } from "../ui/Tooltip";
import {
  LuSquareDashed,
  LuWaypoints,
  LuArrowRight,
  LuRotateCcw,
} from "react-icons/lu";
import { ClickableConstellation, Star } from "../ui/ClickableConstellation";

export default function Constellations({
  dataRef,
  dataName,
  onApply,
}: RefineMenuProps) {
  // const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [shapeImage, setShapeImage] = useState<string | null>(null);
  const [shapeLoading, setShapeLoading] = useState(true);

  const [boundariesImage, setBoundariesImage] = useState<string | null>(null);
  const [boundariesLoading, setBoundariesLoading] = useState(true);

  // number of stars
  const [nStars, setNStars] = useState("100");
  const MAX_STARS = 300;

  const [applyLoading, setApplyLoading] = useState(false);
  const [filterType, setFilterType] = useState<string | null>("shape");

  const [customOrderOn, setCustomOrderOn] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const [stars, setStars] = useState<Star[]>([]);
  const [lines, setLines] = useState<[number, number][]>([]);
  const [interactiveLoading, setInteractiveLoading] = useState(false);

  console.log(order)

  // Fetch stick figure on first load
  useEffect(() => {
    const fetchShape = async () => {
      try {
        const response = await apiRequest(
          `${constellationsAPI}/get-and-plot/`,
          {
            name: dataName,
            n_stars: nStars,
            by_shape: true,
          },
        );

        setShapeImage(`data:image/svg+xml;base64,${response.image}`);
      } catch (error) {
        console.error("Failed to fetch stick figure plot:", error);
      } finally {
        setShapeLoading(false);
      }
    };
    fetchShape();
  }, []);

  // fetch boundaries plot on first load + whenever nStars changes
  useEffect(() => {
    const num = Number(nStars);
    if (isNaN(num) || num < 1 || num > MAX_STARS || !Number.isInteger(num)) {
      return; // don't plot if input is invalid
    }

    const fetchBoundaries = async () => {
      try {
        const response = await apiRequest(
          `${constellationsAPI}/get-and-plot/`,
          {
            name: dataName,
            n_stars: nStars,
            by_shape: false,
          },
        );

        setBoundariesImage(`data:image/svg+xml;base64,${response.image}`);
      } catch (error) {
        console.error("Failed to fetch boundaries plot:", error);
      } finally {
        setBoundariesLoading(false);
      }
    };
    fetchBoundaries();
  }, [nStars]);

  useEffect(() => {
    if (!customOrderOn) return;
    if (lines.length > 0 && stars.length > 0) return;
    plotInteractive();
  }, [customOrderOn]);

  const plotInteractive = async () => {
    setInteractiveLoading(true);

    const endpoint = `${constellationsAPI}/get-plotting-data/`;
    const payload = {
      name: dataName,
      by_shape: true,
      n_stars: nStars,
    };

    const result = await apiRequest(endpoint, payload);

    setLines(result.lines);
    setStars(result.stars);
    setInteractiveLoading(false);
  };

  const handleClickApply = async () => {
    setApplyLoading(true);

    const endpoint = `${constellationsAPI}/save-refined/`;
    const payload = {
      name: dataName,
      by_shape: filterType === "shape",
      n_stars: nStars,
      ...(filterType === "shape" && { order: order }),
    };

    const result = await apiRequest(endpoint, payload);

    if (onApply) {
      onApply(result.file_ref, result.ra, result.dec);
    }
    setApplyLoading(false);
  };

  const cards = [
    {
      value: "shape",
      title: "Stick Figure",
      description: `Sonify the stars that make up the classic shape of ${dataName}`,
      icon: <LuWaypoints />,
    },
    {
      value: "boundaries",
      title: "Boundaries",
      description: (
        <>
          Sonify the brightest stars within the{" "}
          <Link
            href="https://en.wikipedia.org/wiki/IAU_designated_constellations"
            color="teal.500"
            textDecoration="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            constellation boundaries
          </Link>
        </>
      ),
      icon: <LuSquareDashed />,
    },
  ];

  // Track whether or not to disable the continue button
  const invalidNStars =
    filterType === "boundaries" &&
    (Number(nStars) > MAX_STARS || !Number.isInteger(Number(nStars)) || Number(nStars) < 0);
  const unselectedStars =
    filterType === "shape" && customOrderOn && order.length !== stars.length;

  return (
    <Stack
      gap="10"
      align="start"
      justify="center"
      direction={{ base: "column", md: "row" }}
    >
      <Box flex="1">
        <VStack align="center" justify="center" gap={{ md: "10" }} w="auto">
          <RadioCard.Root
            value={filterType}
            colorPalette="teal"
            onValueChange={(e) => setFilterType(e.value)}
          >
            <Stack align="stretch" direction={{ base: "column", md: "row" }}>
              {cards.map((card) => (
                <RadioCard.Item key={card.value} value={card.value}>
                  <RadioCard.ItemHiddenInput />
                  <RadioCard.ItemControl>
                    <RadioCard.ItemContent>
                      <Icon size="xl" color="fg.muted" mb="2">
                        {card.icon}
                      </Icon>
                      <RadioCard.ItemText textStyle="md">
                        {card.title}
                      </RadioCard.ItemText>
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
          {filterType === "shape" && (
            <HStack>
              <CheckboxCard.Root
                colorPalette="teal"
                checked={customOrderOn}
                onCheckedChange={(e) => setCustomOrderOn(!!e.checked)}
              >
                <CheckboxCard.HiddenInput />
                <CheckboxCard.Control>
                  <CheckboxCard.Content>
                    <CheckboxCard.Label>Choose custom order</CheckboxCard.Label>
                  </CheckboxCard.Content>
                  <CheckboxCard.Indicator />
                </CheckboxCard.Control>
              </CheckboxCard.Root>
              <InfoTip
                positioning={{ placement: "right" }}
                contentProps={{ maxW: "300px" }}
                content="Use this if you want the stars to play in a specific order. In the next step, your chosen order will automatically be mapped to Time."
              />
            </HStack>
          )}
          {filterType === "boundaries" && (
            <HStack gap={10} pt={{ base: 6, md: 0 }}>
              <Field.Root width="auto" invalid={invalidNStars}>
                <HStack>
                  <Field.Label>Number of stars</Field.Label>
                  <InfoTip
                    content="Selects the brightest stars up to the number specified."
                    positioning={{ placement: "right" }}
                  />
                </HStack>
                <NumberInput.Root
                  min={1}
                  max={MAX_STARS}
                  step={1}
                  value={nStars}
                  onValueChange={(e) => {
                    setNStars(e.value);
                  }}
                  inputMode="numeric"
                >
                  <NumberInput.Input aria-valuetext={`${nStars} stars`} />
                </NumberInput.Root>
                <Field.HelperText>Maximum {MAX_STARS}</Field.HelperText>
              </Field.Root>
            </HStack>
          )}
          <Box display={{ base: "none", md: "flex" }}>
            <Tooltip
              content={
                unselectedStars
                  ? "Select all stars to continue"
                  : "Invalid number of stars"
              }
              disabled={!unselectedStars && !invalidNStars}
            >
              <Button
                w="auto"
                disabled={unselectedStars || invalidNStars}
                onClick={handleClickApply}
                colorPalette="teal"
                loading={applyLoading}
                loadingText="Saving..."
              >
                Apply & Continue <LuArrowRight />
              </Button>
            </Tooltip>
          </Box>
        </VStack>
      </Box>

      <Box flex="1" borderWidth="1px" borderRadius="md">
        {filterType === "shape" &&
          (customOrderOn ? (
            interactiveLoading ? (
              <LoadingMessage msg="" icon="pulsar" />
            ) : (
              <>
                <Flex direction="column" gap={3} p={4}>
                  <HStack minH="8" gap={5}>
                    <Text fontSize="sm" color="fg.muted">
                      {order.length === 0
                        ? "Click the stars in the order you'd like them to play."
                        : `${order.length} of ${stars.length} stars selected`}
                    </Text>
                    {order.length > 1 && (
                      <Button
                        animation="fade-in 300ms ease-out"
                        colorPalette="teal"
                        size="xs"
                        variant="surface"
                        onClick={() => setOrder([])}
                      >
                        <LuRotateCcw />
                        Reset
                      </Button>
                    )}
                  </HStack>

                  <ClickableConstellation
                    stars={stars}
                    lines={lines}
                    order={order}
                    onOrderChange={setOrder}
                  />
                </Flex>
              </>
            )
          ) : shapeLoading ? (
            <LoadingMessage msg="" icon="pulsar" />
          ) : shapeImage ? (
            <Image
              src={shapeImage}
              alt={`The stick figure shape of ${dataName}.`}
              animation="fade-in 300ms ease-out"
              rounded="md"
            />
          ) : (
            <ErrorMsg message="Unable to plot data." />
          ))}
        {filterType === "boundaries" &&
          (boundariesLoading ? (
            <LoadingMessage msg="" icon="pulsar" />
          ) : boundariesImage ? (
            <Image
              src={boundariesImage}
              alt={`A plot of the brightest ${nStars} in ${dataName}.`}
              animation="fade-in 300ms ease-out"
              rounded="md"
            />
          ) : (
            <ErrorMsg message="Unable to plot data." />
          ))}
      </Box>
      <Box w="100%" display={{ base: "block", md: "none" }}>
        <Tooltip
          content={
            unselectedStars
              ? "Select all stars to continue"
              : "Invalid number of stars"
          }
          disabled={!unselectedStars && !invalidNStars}
        >
          <Button
            w="auto"
            disabled={unselectedStars || invalidNStars}
            onClick={handleClickApply}
            colorPalette="teal"
            loading={applyLoading}
            loadingText="Saving..."
          >
            Apply & Continue <LuArrowRight />
          </Button>
        </Tooltip>
      </Box>
    </Stack>
  );
}
