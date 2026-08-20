import {
  Box,
  Button,
  createListCollection,
  Checkbox,
  Code,
  Collapsible,
  Field,
  Heading,
  Image,
  Input,
  Icon,
  IconButton,
  Link,
  Text,
  Flex,
  NumberInput,
  VStack,
  Stack,
  Select,
  SegmentGroup,
  Slider,
  Skeleton,
  RadioCard,
  HStack,
} from "@chakra-ui/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RefineMenuProps } from "./RefineMenu";
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoadingMessage from "../ui/LoadingMessage";
import ErrorMsg from "../ui/ErrorMsg";
import { apiUrl, constellationsAPI, coreAPI } from "../../apiConfig";
import { apiRequest } from "../../utils/requests";
import { plotData } from "../../utils/plot";
import { InfoTip } from "../ui/ToggleTip";
import { Tooltip } from "../ui/Tooltip";
import { LuSquareDashed, LuWaypoints, LuArrowRightLeft, LuArrowRight, LuGripVertical } from "react-icons/lu";
import { Star, SortableStarItem } from "../ui/SortableStarItem";

export default function Constellations({
  dataRef,
  dataName,
  onApply,
}: RefineMenuProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // number of stars
  const [nStars, setNStars] = useState("100");

  const [applyLoading, setApplyLoading] = useState(false);
  const [filterType, setFilterType] = useState<string | null>("shape");

  const [stars, setStars] = useState<Star[]>([]);
  const [starsLoading, setStarsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // initial plot + star list, when switching to shape mode (or nStars changes for boundaries)
  useEffect(() => {
    const num = Number(nStars);
    if (isNaN(num) || num < 1 || num > 1000 || !Number.isInteger(num)) return;

    const handler = setTimeout(() => {
      if (filterType === "shape") {
        fetchStarsAndPlot();
      } else {
        plotConstellation();
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [nStars, filterType]);

  const fetchStarsAndPlot = async () => {
    setImageLoading(true);
    setStarsLoading(true);

    const endpoint = `${constellationsAPI}/get-and-plot/`;
    const payload = {
      name: dataName,
      by_shape: true,
      n_stars: nStars,
    };

    const result = await apiRequest(endpoint, payload);

    setImageSrc(`data:image/svg+xml;base64,${result.image}`);
    setStars(result.stars); // [{ id, label }, ...] in default order
    setImageLoading(false);
    setStarsLoading(false);
  };

  // re-plot (labels only) when the order changes via drag
  const replotWithOrder = async (orderedStars: Star[]) => {
    setImageLoading(true);

    const endpoint = `${constellationsAPI}/get-and-plot/`;
    const payload = {
      name: dataName,
      by_shape: true,
      n_stars: nStars,
      order: orderedStars.map((s) => s.id),
    };

    const result = await apiRequest(endpoint, payload);
    setImageSrc(`data:image/svg+xml;base64,${result.image}`);
    setImageLoading(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setStars((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      replotWithOrder(reordered); // fire and forget; consider debouncing if drags are rapid
      return reordered;
    });
  };

  // request plot from backend
  const plotConstellation = async () => {
    setImageLoading(true);

    const endpoint = `${constellationsAPI}/get-and-plot/`;
    const payload = {
      name: dataName,
      by_shape: filterType === "shape",
      n_stars: nStars,
    };

    const result = await apiRequest(endpoint, payload);

    // update image state
    setImageSrc(`data:image/svg+xml;base64,${result.image}`);

    setImageLoading(false);
  };

  const handleClickApply = async () => {
    setApplyLoading(true);

    const endpoint = `${constellationsAPI}/save-refined/`;
    const payload = {
      name: dataName,
      by_shape: filterType === "shape",
      n_stars: nStars,
      ...(filterType === "shape" && { order: stars.map((s) => s.id) }),
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
          <Collapsible.Root open={filterType === "shape"}>
            <Collapsible.Content>
              <Box pt={{ base: 6, md: 0 }} maxH="320px" overflowY="auto">
                <Text fontWeight="medium" mb="2">
                  Play order
                </Text>
                {starsLoading ? (
                  <VStack gap="2" align="stretch">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} height="40px" borderRadius="md" />
                    ))}
                  </VStack>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={stars.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <VStack gap="2" align="stretch">
                        {stars.map((star, i) => (
                          <SortableStarItem
                            key={star.id}
                            star={star}
                            order={i + 1}
                          />
                        ))}
                      </VStack>
                    </SortableContext>
                  </DndContext>
                )}
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
          <Collapsible.Root open={filterType == "boundaries"}>
            <Collapsible.Content>
              <HStack gap={10} pt={{ base: 6, md: 0 }}>
                <Field.Root width="auto">
                  <Field.Label>Number of Stars</Field.Label>
                  <NumberInput.Root
                    min={1}
                    max={300}
                    value={nStars}
                    onValueChange={(e) => {
                      setNStars(e.value);
                    }}
                    inputMode="numeric"
                  >
                    <NumberInput.Input aria-valuetext={`${nStars} stars`} />
                  </NumberInput.Root>
                  {Number(nStars) > 100 && (
                    <Field.HelperText>
                      Warning: Sonification may take significantly longer to
                      generate for large numbers of stars
                    </Field.HelperText>
                  )}
                </Field.Root>
              </HStack>
            </Collapsible.Content>
          </Collapsible.Root>
          <Box display={{ base: "none", md: "flex" }}>
            <Button
              w="auto"
              onClick={handleClickApply}
              colorPalette="teal"
              loading={applyLoading}
              loadingText="Saving..."
            >
              Apply & Continue <LuArrowRight />
            </Button>
          </Box>
        </VStack>
      </Box>

      <Box flex="1" borderWidth="1px" borderRadius="md">
        {imageLoading ? (
          <LoadingMessage msg="" icon="pulsar" />
        ) : imageSrc ? (
          <Image
            src={imageSrc}
            alt={`A plot of the ${nStars} brightest stars in ${dataName}.`}
            animation="fade-in 300ms ease-out"
            rounded="md"
          />
        ) : (
          <ErrorMsg message="Unable to plot data." />
        )}
      </Box>
      <Box w="100%" display={{ base: "block", md: "none" }}>
        <Button
          w="100%"
          onClick={handleClickApply}
          colorPalette="teal"
          loading={applyLoading}
          loadingText="Saving..."
        >
          Apply & Continue <LuArrowRight />
        </Button>
      </Box>
    </Stack>
  );
}
