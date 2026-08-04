import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  ActionBar,
  Box,
  Button,
  Card,
  Badge,
  Dialog,
  Editable,
  Stack,
  FileUpload,
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
  Link,
  Input,
  Field,
  Checkbox,
} from "@chakra-ui/react";
import PageContainer from "../ui/PageContainer";
import { Tooltip } from "../ui/Tooltip";
import { composerAPI, coreAPI } from "../../apiConfig";
import { useComposer, type Layer } from "../../context/ComposerContext";
import {
  LuPlus,
  LuCheck,
  LuX,
  LuCopy,
  LuTrash2,
  LuTriangleAlert,
  LuArrowRight,
  LuUpload,
  LuSlidersHorizontal,
  LuPalette,
  LuCircleHelp,
} from "react-icons/lu";
import ErrorMsg from "../ui/ErrorMsg";
import HelperDialog from "../data_composer/HelperDialog";
import { apiRequest } from "../../utils/requests";

function makeLayerId() {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeEmptyLayer(index: number): Layer {
  return {
    id: makeLayerId(),
    label: `Layer ${index}`,
    dataName: null,
    dataRef: null,
    reusedFromLayerId: null,
    refined: false,
    styleRef: null,
    styleName: null,
    mappedColumns: null,
    invalidColumns: null,
  };
}

const MAX_LAYERS = 6;

export default function DataComposer() {
  const navigate = useNavigate();
  const soniType = "data_composer";

  const { layers, setLayers, updateLayer } = useComposer();

  // Tracks each layer's current dropdown choice ("new" or another layer's id)
  const [dataSourceChoice, setDataSourceChoice] = useState<
    Record<string, string>
  >({});

  // Which layers currently have their Data slot open for editing
  // (either because they have no data yet, or the user clicked "Change").
  const [editingLayerIds, setEditingLayerIds] = useState<Set<string>>(
    new Set(),
  );

  const isEditingData = (layer: Layer) =>
    !layer.dataName || editingLayerIds.has(layer.id);

  const [uploadReady, setUploadReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    fileRef: string;
    fileName: string;
  } | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [hasHeader, setHasHeader] = useState(true);

  const dependentsOf = (layerId: string) =>
    layers.filter((l) => l.reusedFromLayerId === layerId);

  // ---- Add layer ----
  const handleAddLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    const newLayer = makeEmptyLayer(layers.length + 1);
    setLayers((prev) => [...prev, newLayer]);
  };

  // ---- Data slot: choose source (reuse vs upload) ----

  const reuseOptionsForLayer = (layerId: string) =>
    createListCollection({
      items: [
        { label: "Upload new data", value: "new" },
        ...layers
          .filter((l) => l.id !== layerId && l.dataName)
          .map((l) => ({
            label: `${l.label} (${l.dataName})`,
            value: l.id,
          })),
      ],
    });

  const handleDataSourceChange = (layerId: string, value: string) => {
    setDataSourceChoice((prev) => ({ ...prev, [layerId]: value }));

    if (value === "new") return; // still editing — reveal the upload button

    const layer = layers.find((l) => l.id === layerId);
    const source = layers.find((l) => l.id === value);
    if (!layer || !source) return;

    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId
          ? {
              ...l,
              reusedFromLayerId: source.id,
              dataName: source.dataName,
              dataRef: source.dataRef,
              refined: source.refined,
              styleRef: null,
              styleName: null,
              invalidColumns: source.invalidColumns,
            }
          : l,
      ),
    );

    // Reuse selected successfully — close edit mode for this layer.
    setEditingLayerIds((prev) => {
      const next = new Set(prev);
      next.delete(layerId);
      return next;
    });
  };

  const handleFileAccept = async (files: FileList | File[]) => {
    setUploadErrorMessage("");
    setPendingUpload(null);
    setUploadReady(false);

    const file = files[0];

    if (!file) {
      setUploading(false);
      return;
    }

    if (file.size > 1e7) {
      setUploading(false);
      setUploadErrorMessage("File too large. Maximum size is 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    let result: { file_ref: string };

    try {
      const res = await fetch(`${coreAPI}/upload-data/`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let message = `HTTP ${res.status}`;

        try {
          const errorData = await res.json();
          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          // response was not JSON (ignore)
        }
        setUploadErrorMessage(message);
        console.error(message);
        return;
      }

      result = await res.json();

      setPendingUpload({
        fileRef: result.file_ref,
        fileName: file.name.split(".")[0],
      });
      setUploadReady(true);
    } catch (err) {
      setUploadErrorMessage("Failed to upload file. Please try again.");
      console.error(err);
      return;
    }
  };

  const handleConfirmUpload = async (layer: Layer) => {
    setUploading(true);

    if (!pendingUpload) {
      return;
    }

    try {
      const endpoint = `${composerAPI}/set-header/`;
      const payload = {
        file_ref: pendingUpload.fileRef,
        has_header: hasHeader,
      };
      const result = await apiRequest(endpoint, payload);

      setLayers((prev) =>
        prev.map((l) =>
          l.id === layer.id
            ? {
                ...l,
                dataName: pendingUpload.fileName,
                dataRef: pendingUpload.fileRef,
                reusedFromLayerId: null,
                refined: false,
                styleRef: null,
                styleName: null,
                invalidColumns: result.invalid_columns,
              }
            : l,
        ),
      );

      // Upload successful — close edit mode for this layer.
      setEditingLayerIds((prev) => {
        const next = new Set(prev);
        next.delete(layer.id);
        return next;
      });

      setUploadDialogOpen(false);
    } catch (err) {
      console.error("Error setting header on upload: ", err);
      setUploadErrorMessage("Error uploading data, please try another file.");
    } finally {
      setUploading(false);
    }
  };

  const handleRefine = (layer: Layer) => {
    navigate("/refine", {
      state: {
        dataName: layer.dataName,
        dataRef: layer.dataRef,
        layerID: layer.id,
        soniType,
      },
    });
  };

  const handleChooseStyle = (layer: Layer) => {
    navigate("/style", {
      state: {
        dataName: layer.dataName,
        dataRef: layer.dataRef,
        layerID: layer.id,
        soniType,
      },
    });
  };

  // ---- Duplicate / delete ----

  const handleDuplicateLayer = (id: string) => {
    if (layers.length >= MAX_LAYERS) return;

    const source = layers.find((l) => l.id === id);
    if (!source) return;

    // Remove any existing "(Copy)" or "(Copy N)" suffix.
    const baseLabel = source.label.replace(/ \(Copy(?: \d+)?\)$/, "");

    // Count existing copies of this base label.
    const copyCount =
      layers.filter(
        (l) =>
          l.label === baseLabel ||
          l.label.match(
            new RegExp(
              `^${baseLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(Copy(?: \\d+)?\\)$`,
            ),
          ),
      ).length - 1;

    const label =
      copyCount === 0
        ? `${baseLabel} (Copy)`
        : `${baseLabel} (Copy ${copyCount + 1})`;

    const copy: Layer = {
      ...source,
      id: makeLayerId(),
      label,
      reusedFromLayerId:
        source.dataRef == null ? null : (source.reusedFromLayerId ?? source.id),
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
              mappedColumns: null,
              invalidColumns: null,
            }
          : l,
      );
    });
    setPendingDeleteId(null);
  };

  const allLayersReady =
    layers.length > 0 &&
    layers.every((l) => l.dataName && l.styleName) &&
    layers.every((l) => !isEditingData(l)) &&
    layers.every(
      (l) =>
        l.refined ||
        !l.mappedColumns?.some((col) => l.invalidColumns?.includes(col)),
    );

  const handleProceedToSonify = () => {
    navigate("/sonify", { state: { layers } });
  };

  const pendingDeleteLayer = layers.find((l) => l.id === pendingDeleteId);
  const pendingDeleteDependents = pendingDeleteId
    ? dependentsOf(pendingDeleteId)
    : [];

  const handleRenameLayer = (id: string, label: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, label } : layer)),
    );
  };

  return (
    <PageContainer>
      <Heading as="h1">Data Composer</Heading>
      <br />
      <Stack direction={{ base: "column", md: "row" }} gap="4">
        <Text textStyle="lg">
          Build a layered sonification from your own data.
        </Text>
        <Link
          onClick={() => setHowItWorksOpen(true)}
          color="teal.500"
          fontSize="sm"
          cursor="pointer"
          whiteSpace="nowrap"
        >
          <HStack gap="2">
            <LuCircleHelp />
            <Text>How does this work?</Text>
          </HStack>
        </Link>
      </Stack>
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
            const canChooseStyle = !!layer.dataName;
            const hasReusableData = layers.some(
              (l) => l.id !== layer.id && l.dataName,
            );
            const invalid =
              !layer.refined &&
              layer.mappedColumns?.some((col) =>
                layer.invalidColumns?.includes(col),
              );

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
                      <Card.Title>
                        <Editable.Root
                          value={layer.label}
                          onValueChange={(e) =>
                            handleRenameLayer(layer.id, e.value)
                          }
                        >
                          <Editable.Preview
                            textStyle="lg"
                            fontWeight="semibold"
                          />
                          <Editable.Input
                            textStyle="lg"
                            fontWeight="semibold"
                          />
                          <Editable.Control>
                            <Editable.CancelTrigger asChild>
                              <IconButton variant="outline" size="xs">
                                <LuX />
                              </IconButton>
                            </Editable.CancelTrigger>
                            <Editable.SubmitTrigger asChild>
                              <IconButton variant="outline" size="xs">
                                <LuCheck />
                              </IconButton>
                            </Editable.SubmitTrigger>
                          </Editable.Control>
                        </Editable.Root>
                      </Card.Title>
                      {invalid && (
                        <Badge colorPalette="orange" gap="1">
                          <LuTriangleAlert /> Needs attention
                        </Badge>
                      )}
                    </HStack>

                    <HStack
                      gap="1"
                      justify={{ base: "flex-end", md: "flex-start" }}
                    >
                      <Tooltip content="Duplicate layer">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label={`Duplicate ${layer.label}`}
                          disabled={layers.length >= MAX_LAYERS}
                          onClick={() => handleDuplicateLayer(layer.id)}
                        >
                          <LuCopy />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Delete layer">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          aria-label={`Delete ${layer.label}`}
                          onClick={() => handleRequestDelete(layer.id)}
                        >
                          <LuTrash2 />
                        </IconButton>
                      </Tooltip>
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
                      {!isEditingData(layer) ? (
                        <VStack align="start" gap="2">
                          <Box>
                            <Text fontWeight="medium">{layer.dataName}</Text>
                            {layer.reusedFromLayerId && (
                              <Text fontSize="xs" color="fg.muted">
                                Same as{" "}
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
                                setEditingLayerIds((prev) =>
                                  new Set(prev).add(layer.id),
                                )
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
                        <HStack align="start" gap="2">
                          {isEditingData(layer) && hasReusableData && (
                            <Select.Root
                              collection={reuseOptionsForLayer(layer.id)}
                              value={[dataSourceChoice[layer.id] ?? "new"]}
                              onValueChange={(e) =>
                                handleDataSourceChange(layer.id, e.value[0])
                              }
                              width="100%"
                            >
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
                                    {reuseOptionsForLayer(layer.id).items.map(
                                      (option) => (
                                        <Select.Item
                                          item={option}
                                          key={option.value}
                                        >
                                          {option.label}
                                          <Select.ItemIndicator />
                                        </Select.Item>
                                      ),
                                    )}
                                  </Select.Content>
                                </Select.Positioner>
                              </Portal>
                            </Select.Root>
                          )}
                          {isEditingData(layer) &&
                            (!hasReusableData ||
                              (dataSourceChoice[layer.id] ?? "new") ===
                                "new") && (
                              <Box animation="fade-in 300ms ease-out">
                                <Dialog.Root
                                  lazyMount
                                  open={uploadDialogOpen}
                                  onOpenChange={(e) =>
                                    setUploadDialogOpen(e.open)
                                  }
                                >
                                  <Dialog.Trigger asChild>
                                    <Button
                                      colorPalette="teal"
                                      size="sm"
                                      loading={uploading}
                                    >
                                      <LuUpload />
                                      Upload data
                                    </Button>
                                  </Dialog.Trigger>
                                  <Portal>
                                    <Dialog.Backdrop />
                                    <Dialog.Positioner>
                                      <Dialog.Content>
                                        <Dialog.Header>
                                          <Dialog.Title>
                                            Upload data
                                          </Dialog.Title>
                                        </Dialog.Header>
                                        <Dialog.Body>
                                          <VStack gap={6}>
                                            <FileUpload.Root
                                              accept={{ "*/*": [".csv"] }}
                                              maxFiles={1}
                                              maxFileSize={1e7}
                                              onFileAccept={({ files }) =>
                                                handleFileAccept(files)
                                              }
                                              onFileReject={(details) => {
                                                setUploadErrorMessage(
                                                  `File rejected: ${details.files[0].errors.join(", ")}`,
                                                );
                                              }}
                                            >
                                              <FileUpload.HiddenInput />
                                              <Field.Root>
                                                <Field.Label fontWeight="semibold">
                                                  Upload file
                                                </Field.Label>
                                                <Input asChild>
                                                  <FileUpload.Trigger>
                                                    <FileUpload.FileText />
                                                  </FileUpload.Trigger>
                                                </Input>
                                                <Field.HelperText>
                                                  CSV only, up to 10MB.
                                                </Field.HelperText>
                                              </Field.Root>
                                            </FileUpload.Root>
                                            {uploadErrorMessage && (
                                              <ErrorMsg
                                                message={uploadErrorMessage}
                                                onClose={() =>
                                                  setUploadErrorMessage("")
                                                }
                                              />
                                            )}
                                            <Checkbox.Root
                                              colorPalette="teal"
                                              variant="subtle"
                                              checked={hasHeader}
                                              onCheckedChange={(e) =>
                                                setHasHeader(!!e.checked)
                                              }
                                            >
                                              <Checkbox.HiddenInput />
                                              <Checkbox.Control />
                                              <Checkbox.Label fontWeight="semibold">
                                                My data has a header row
                                              </Checkbox.Label>
                                            </Checkbox.Root>
                                          </VStack>
                                        </Dialog.Body>
                                        <Dialog.Footer justifyContent='center'>
                                          <Dialog.ActionTrigger asChild>
                                            <Button variant="outline">
                                              Cancel
                                            </Button>
                                          </Dialog.ActionTrigger>
                                          <Button
                                            colorPalette="teal"
                                            disabled={!uploadReady}
                                            onClick={() =>
                                              handleConfirmUpload(layer)
                                            }
                                          >
                                            Upload
                                          </Button>
                                        </Dialog.Footer>
                                        <Dialog.CloseTrigger asChild>
                                          <CloseButton size="sm" />
                                        </Dialog.CloseTrigger>
                                      </Dialog.Content>
                                    </Dialog.Positioner>
                                  </Portal>
                                </Dialog.Root>
                              </Box>
                            )}
                        </HStack>
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
              content="Every layer needs data and style selected before you can continue."
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

      {/* How does this work? */}
      <HelperDialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
    </PageContainer>
  );
}
