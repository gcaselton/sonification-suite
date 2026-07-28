import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Badge,
  Dialog,
  Stack,
  Heading,
  VStack,
  HStack,
  Text,
  IconButton,
  Select,
  createListCollection,
  CloseButton,
  Separator,
  Portal,
} from "@chakra-ui/react";
import PageContainer from "../ui/PageContainer";
import { Tooltip } from "../ui/Tooltip";
import {
  LuPlus,
  LuCopy,
  LuTrash2,
  LuTriangleAlert,
  LuArrowRight,
  LuUpload,
  LuSlidersHorizontal,
  LuPalette,
  LuVolume2,
  LuVolumeX,
} from "react-icons/lu";

interface DataLayer {
  id: string;
  label: string;

  // Data slot
  dataName: string | null;
  dataRef: string | null;
  reusedFromLayerId: string | null;
  refined: boolean;

  // Style slot
  styleRef: string | null;
  styleName: string | null;

  // Derived / validation
  pointCount: number | null;
  mismatch: boolean;

  muted: boolean;
}

function makeLayerId() {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeEmptyLayer(index: number): DataLayer {
  return {
    id: makeLayerId(),
    label: `Layer ${index}`,
    dataName: null,
    dataRef: null,
    reusedFromLayerId: null,
    refined: false,
    styleRef: null,
    styleName: null,
    pointCount: null,
    mismatch: false,
    muted: false,
  };
}

const MAX_LAYERS = 6;

export default function DataComposer() {
  const navigate = useNavigate();

  const [layers, setLayers] = useState<DataLayer[]>([]);

  // Per-layer "choose data source" dialog (only shown for layer 2+)
  const [dataDialogLayerId, setDataDialogLayerId] = useState<string | null>(
    null,
  );
  const [reuseChoice, setReuseChoice] = useState<string[]>(["new"]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const dependentsOf = (layerId: string) =>
    layers.filter((l) => l.reusedFromLayerId === layerId);

  const layerIndex = (id: string) => layers.findIndex((l) => l.id === id);

  // ---- Add layer ----

  const handleAddLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    const newLayer = makeEmptyLayer(layers.length + 1);
    setLayers((prev) => [...prev, newLayer]);

    if (layers.length === 0) {
      // First layer: no reuse option, straight to upload
      navigateToUpload(newLayer);
    }
    // For layer 2+, the card renders with an empty Data slot; the user
    // clicks "Choose data" on the card itself, which opens the reuse dialog.
  };

  // ---- Data slot: choose source (reuse vs upload) ----

  const reuseOptionsFor = (layerId: string) =>
    createListCollection({
      items: [
        { label: "Upload new data", value: "new" },
        ...layers
          .filter((l) => l.id !== layerId && l.dataName)
          .map((l) => ({
            label: `Reuse data from ${l.label} (${l.dataName})`,
            value: l.id,
          })),
      ],
    });

  const handleOpenDataDialog = (layerId: string) => {
    setReuseChoice(["new"]);
    setDataDialogLayerId(layerId);
  };

  const handleConfirmDataChoice = () => {
    const layer = layers.find((l) => l.id === dataDialogLayerId);
    if (!layer) return;
    const choice = reuseChoice[0];

    if (choice === "new") {
      setDataDialogLayerId(null);
      navigateToUpload(layer);
      return;
    }

    const source = layers.find((l) => l.id === choice);
    if (source) {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layer.id
            ? {
                ...l,
                reusedFromLayerId: source.id,
                dataName: source.dataName,
                dataRef: source.dataRef,
                refined: source.refined,
                // Changing data invalidates any previously chosen style,
                // since column names/lengths may no longer match.
                styleRef: null,
                styleName: null,
                pointCount: null,
                mismatch: false,
              }
            : l,
        ),
      );
    }
    setDataDialogLayerId(null);
  };

  const navigateToUpload = (layer: DataLayer) => {
    // TODO: route to the (not-yet-built) CSV upload page for Composer layers.
    navigate("/data-composer/upload", {
      state: {
        layer,
        composerReturn: { page: "/data-composer", layerId: layer.id },
      },
    });
  };

  const handleRefine = (layer: DataLayer) => {
    // TODO: route to the (not-yet-designed) bespoke refine page for
    // user-uploaded data.
    navigate("/data-composer/refine", {
      state: {
        layer,
        composerReturn: { page: "/data-composer", layerId: layer.id },
      },
    });
  };

  const handleChooseStyle = (layer: DataLayer) => {
    navigate("/style", {
      state: {
        dataName: layer.dataName,
        dataRef: layer.dataRef,
        composerReturn: { page: "/data-composer", layerId: layer.id },
      },
    });
  };

  // ---- Duplicate / delete / mute ----

  const handleDuplicateLayer = (id: string) => {
    if (layers.length >= MAX_LAYERS) return;
    const source = layers.find((l) => l.id === id);
    if (!source) return;

    const copy: DataLayer = {
      ...source,
      id: makeLayerId(),
      label: `Layer ${layers.length + 1}`,
      reusedFromLayerId: source.reusedFromLayerId ?? source.id,
    };
    setLayers((prev) => [...prev, copy]);
  };

  const handleRequestDelete = (id: string) => {
    if (dependentsOf(id).length > 0) {
      setPendingDeleteId(id);
    } else {
      deleteLayer(id);
    }
  };

  const deleteLayer = (id: string) => {
    setLayers((prev) => {
      const remaining = prev.filter((l) => l.id !== id);
      return remaining.map((l) =>
        l.reusedFromLayerId === id
          ? {
              ...l,
              reusedFromLayerId: null,
              dataName: null,
              dataRef: null,
              refined: false,
              styleRef: null,
              styleName: null,
              pointCount: null,
              mismatch: false,
            }
          : l,
      );
    });
    setPendingDeleteId(null);
  };

  const handleToggleMute = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, muted: !l.muted } : l)),
    );
  };

  const allLayersReady =
    layers.length > 0 &&
    layers.every((l) => l.dataName && l.styleName && !l.mismatch);

  const handleProceedToSonify = () => {
    navigate("/sonify", { state: { layers } });
  };

  const pendingDeleteLayer = layers.find((l) => l.id === pendingDeleteId);
  const pendingDeleteDependents = pendingDeleteId
    ? dependentsOf(pendingDeleteId)
    : [];

  return (
    <PageContainer>
      <Heading as="h1">Data Composer</Heading>
      <br />
      <Text textStyle="lg">
        Build a layered sonification from your own data. 
      </Text>
      <br />
      <br />

      {layers.length === 0 ? (
        <Box
          borderWidth="1px"
          borderStyle="dashed"
          borderRadius="lg"
          py="12"
          px="6"
          textAlign="center"
        >
          <Text color="fg.muted" mb="4">
            You haven't added any layers yet.
          </Text>
          <Button colorPalette="teal" onClick={handleAddLayer}>
            <LuPlus /> Add your first layer
          </Button>
        </Box>
      ) : (
        <Stack gap="4" animation="fade-in 300ms ease-out">
          {layers.map((layer) => {
            const isFirstLayer = layerIndex(layer.id) === 0;
            const canChooseStyle = !!layer.dataName;

            return (
              <Card.Root key={layer.id} variant="outline" width="100%">
                <Card.Body>
                  <Stack
                    direction={{ base: "column", md: "row" }}
                    justify="space-between"
                    align={{ base: "stretch", md: "center" }}
                    gap="3"
                    mb="4"
                  >
                    <HStack>
                      <Card.Title>{layer.label}</Card.Title>
                      {layer.mismatch && (
                        <Badge colorPalette="orange" gap="1">
                          <LuTriangleAlert /> Needs attention
                        </Badge>
                      )}
                    </HStack>

                    <HStack
                      gap="1"
                      justify={{ base: "flex-end", md: "flex-start" }}
                    >
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={
                          layer.muted
                            ? `Unmute ${layer.label}`
                            : `Mute ${layer.label}`
                        }
                        onClick={() => handleToggleMute(layer.id)}
                      >
                        {layer.muted ? <LuVolumeX /> : <LuVolume2 />}
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Duplicate ${layer.label}`}
                        disabled={layers.length >= MAX_LAYERS}
                        onClick={() => handleDuplicateLayer(layer.id)}
                      >
                        <LuCopy />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        aria-label={`Delete ${layer.label}`}
                        onClick={() => handleRequestDelete(layer.id)}
                      >
                        <LuTrash2 />
                      </IconButton>
                    </HStack>
                  </Stack>

                  <Stack direction={{ base: "column", sm: "row" }} gap="3">
                    {/* Data slot */}
                    <Box flex="1" borderWidth="1px" borderRadius="md" p="3">
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        color="fg.muted"
                        mb="2"
                      >
                        DATA
                      </Text>
                      {layer.dataName ? (
                        <VStack align="start" gap="2">
                          <Box>
                            <Text fontWeight="medium">{layer.dataName}</Text>
                            {layer.reusedFromLayerId && (
                              <Text fontSize="xs" color="fg.muted">
                                Reused from{" "}
                                {
                                  layers.find(
                                    (l) => l.id === layer.reusedFromLayerId,
                                  )?.label
                                }
                              </Text>
                            )}
                          </Box>
                          <HStack gap="2" flexWrap="wrap">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                isFirstLayer
                                  ? navigateToUpload(layer)
                                  : handleOpenDataDialog(layer.id)
                              }
                            >
                              Change
                            </Button>
                            <Button
                              size="xs"
                              variant={layer.refined ? "outline" : "solid"}
                              colorPalette="teal"
                              onClick={() => handleRefine(layer)}
                            >
                              <LuSlidersHorizontal />
                              {layer.refined ? "Refine" : "Refine data"}
                            </Button>
                          </HStack>
                        </VStack>
                      ) : (
                        <Button
                          size="sm"
                          colorPalette="teal"
                          onClick={() =>
                            isFirstLayer
                              ? navigateToUpload(layer)
                              : handleOpenDataDialog(layer.id)
                          }
                        >
                          <LuUpload />{" "}
                          {isFirstLayer ? "Upload data" : "Choose data"}
                        </Button>
                      )}
                    </Box>

                    {/* Style slot */}
                    <Box flex="1" borderWidth="1px" borderRadius="md" p="3">
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        color="fg.muted"
                        mb="2"
                      >
                        STYLE
                      </Text>
                      {layer.styleName ? (
                        <VStack align="start" gap="2">
                          <Text fontWeight="medium">{layer.styleName}</Text>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleChooseStyle(layer)}
                          >
                            Change
                          </Button>
                        </VStack>
                      ) : (
                        <Tooltip
                          content="Add data to this layer first"
                          disabled={canChooseStyle}
                        >
                          <Button
                            size="sm"
                            colorPalette="teal"
                            disabled={!canChooseStyle}
                            onClick={() => handleChooseStyle(layer)}
                          >
                            <LuPalette /> Choose style
                          </Button>
                        </Tooltip>
                      )}
                    </Box>
                  </Stack>
                </Card.Body>
              </Card.Root>
            );
          })}

          <Box>
            <Button
              variant="outline"
              onClick={handleAddLayer}
              disabled={layers.length >= MAX_LAYERS}
            >
              <LuPlus /> Add layer
            </Button>
            {layers.length >= MAX_LAYERS && (
              <Text fontSize="xs" color="fg.muted" mt="1">
                Maximum of {MAX_LAYERS} layers reached.
              </Text>
            )}
          </Box>
        </Stack>
      )}

      {layers.length > 0 && (
        <>
          <br />
          <HStack justify="flex-end">
            <Tooltip
              content="Every layer needs data and a style selected, with no length mismatches, before you can continue."
              disabled={allLayersReady}
            >
              <Button
                colorPalette="teal"
                size="lg"
                disabled={!allLayersReady}
                onClick={handleProceedToSonify}
              >
                Continue to Sonify <LuArrowRight />
              </Button>
            </Tooltip>
          </HStack>
        </>
      )}

      {/* Choose data source (reuse vs upload) — layer 2+ only */}
      <Dialog.Root
        open={dataDialogLayerId !== null}
        onOpenChange={(e) => !e.open && setDataDialogLayerId(null)}
        placement="center"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Choose data for this layer</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="start" gap={4}>
                <Text>
                  Reuse a dataset already used by another layer, or upload
                  something new.
                </Text>
                <Select.Root
                  collection={
                    dataDialogLayerId
                      ? reuseOptionsFor(dataDialogLayerId)
                      : createListCollection({ items: [] })
                  }
                  value={reuseChoice}
                  onValueChange={(e) => setReuseChoice(e.value)}
                  width="100%"
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
                        {(dataDialogLayerId
                          ? reuseOptionsFor(dataDialogLayerId)
                          : createListCollection({ items: [] })
                        ).items.map((option) => (
                          <Select.Item item={option} key={option.value}>
                            {option.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="ghost"
                onClick={() => setDataDialogLayerId(null)}
              >
                Cancel
              </Button>
              <Button colorPalette="teal" onClick={handleConfirmDataChoice}>
                Continue
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete confirmation: warn about dependent layers */}
      <Dialog.Root
        open={pendingDeleteId !== null}
        onOpenChange={(e) => !e.open && setPendingDeleteId(null)}
        placement="center"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete {pendingDeleteLayer?.label}?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                {pendingDeleteDependents.map((l) => l.label).join(", ")}{" "}
                {pendingDeleteDependents.length === 1 ? "reuses" : "reuse"} this
                layer's dataset. Deleting {pendingDeleteLayer?.label} will clear
                their data selection and they'll need to be reconfigured before
                you can continue.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
                Cancel
              </Button>
              <Button
                colorPalette="red"
                onClick={() => pendingDeleteId && deleteLayer(pendingDeleteId)}
              >
                Delete layer
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </PageContainer>
  );
}
