import {
  Box,
  Button,
  Badge,
  Checkbox,
  Field,
  RadioCard,
  Slider,
  Skeleton,
  Stack,
  Table,
  Text,
  VStack,
  HStack,
  Input,
} from "@chakra-ui/react";
import { RefineMenuProps } from "./RefineMenu";
import { useState, useEffect, useMemo, useCallback } from "react";
import LoadingMessage from "../ui/LoadingMessage";
import ErrorMsg from "../ui/ErrorMsg";
import { coreAPI } from "../../apiConfig";
import { apiRequest } from "../../utils/requests";
import { InfoTip } from "../ui/ToggleTip";
import { LuArrowRight, LuTriangleAlert } from "react-icons/lu";
import { debounce } from "es-toolkit";

interface ColumnInfo {
  name: string;
  NaNs: number;
}

type HeaderMode = 'auto' | 'header' | 'no_header';
type NanStrategy = "drop" | "interpolate" | "fill";

export default function DataComposer({
  dataName,
  dataRef,
  onApply,
}: RefineMenuProps) {

  // Column metadata, fetched once on mount
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(),
  );
  const [totalRows, setTotalRows] = useState(0);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [columnsError, setColumnsError] = useState("");
  const [headerMode, setHeaderMode] = useState<HeaderMode>('auto');

  // Missing-value handling
  const [nanStrategy, setNanStrategy] = useState<NanStrategy>('fill');
  const [fillValue, setFillValue] = useState("0");

  // Row range
  const [rowRange, setRowRange] = useState<[number, number]>([0, 0]);

  // Preview (re-fetched whenever the above change)
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");

  const [applyLoading, setApplyLoading] = useState(false);

  const hasNanColumns = columns.some(
    (c) => selectedColumns.has(c.name) && c.NaNs > 0,
  );

  // ---- Fetch column metadata on mount ----
  useEffect(() => {
    if (!dataRef) return;

    let mounted = true;
    async function fetchColumns() {
      setColumnsLoading(true);
      setColumnsError("");

      const endpoint = `${coreAPI}/data-composer/get-columns/`;
      try {
        const result = await apiRequest(
          endpoint,
          { file_ref: dataRef, header_mode: headerMode },
          "POST",
        );
        if (!mounted) return;

        setColumns(result.columns);
        setSelectedColumns(
          new Set(result.columns.map((c: ColumnInfo) => c.name)),
        );
        setTotalRows(result.total_rows);
        setRowRange([0, result.total_rows]);
        setHeaderMode(result.header ? 'header' : 'no_header')
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching column info:", err);
        setColumnsError("Unable to read columns from this file.");
      } finally {
        if (mounted) setColumnsLoading(false);
      }
    }
    fetchColumns();
    return () => {
      mounted = false;
    };
  }, [dataRef, headerMode]);

  // ---- Fetch preview whenever refine settings change ----
  const fetchPreview = useCallback(
    async (
      cols: string[],
      strategy: NanStrategy,
      fill: string,
      range: [number, number],
    ) => {
      if (!dataRef || cols.length === 0) return;
      setPreviewLoading(true);
      setPreviewError("");

      // TODO: backend endpoint not yet built. Expected response shape:
      // { rows: Record<string, unknown>[] }
      const endpoint = `${coreAPI}/data-composer/preview-refined/`;
      const payload = {
        file_ref: dataRef,
        columns: cols,
        has_header: headerMode === 'header',
        nan_strategy: strategy,
        fill_value: strategy === "fill" ? Number(fill) : undefined,
        row_range: range,
      };

      try {
        const result = await apiRequest(endpoint, payload, "POST");
        setPreviewRows(result.rows);
      } catch (err) {
        console.error("Error previewing data:", err);
        setPreviewError("Unable to generate a preview.");
      } finally {
        setPreviewLoading(false);
      }
    },
    [dataRef, headerMode],
  );

  const debouncedFetchPreview = useMemo(
    () => debounce(fetchPreview, 300),
    [fetchPreview],
  );

  useEffect(() => {
    return () => {
      debouncedFetchPreview.cancel();
    };
  }, [debouncedFetchPreview]);

  useEffect(() => {
    if (columnsLoading) return;
    debouncedFetchPreview(
      Array.from(selectedColumns),
      nanStrategy,
      fillValue,
      rowRange,
    );
  }, [selectedColumns, nanStrategy, fillValue, rowRange, columnsLoading]);

  // ---- Handlers ----

  const handleToggleColumn = (name: string, checked: boolean) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  const handleApply = async () => {
    setApplyLoading(true);

    // TODO: backend endpoint not yet built. Expected to return
    // { file_ref: string } for the refined/saved CSV.
    const endpoint = `${coreAPI}/data-composer/save-refined/`;
    const payload = {
      data_name: dataName,
      file_ref: dataRef,
      columns: Array.from(selectedColumns),
      nan_strategy: nanStrategy,
      fill_value: nanStrategy === "fill" ? fillValue : undefined,
      row_range: rowRange,
    };

    try {
      const result = await apiRequest(endpoint, payload, "POST");
      if (onApply) {
        onApply(result.file_ref);
      }
    } catch (err) {
      console.error("Error saving refined data:", err);
    } finally {
      setApplyLoading(false);
    }
  };

  const nanStrategyCards = [
    {
      value: "drop",
      title: "Drop rows",
      description: "Remove any row with a missing value in a selected column.",
    },
    {
      value: "interpolate",
      title: "Interpolate",
      description: "Estimate missing numeric values from surrounding rows.",
    },
    {
      value: "fill",
      title: "Fill with value",
      description: "Replace missing values with a fixed value.",
    },
  ];

  return (
    <Stack
      gap="10"
      align="start"
      justify="center"
      direction={{ base: "column", md: "row" }}
    >
      <Box flex="1" maxWidth={{ base: "100%", md: "50%" }}>
        <VStack align="stretch" gap="8">
          {/* Columns */}
          <Box>
            <HStack mb="2">
              <Text fontWeight="bold">Columns</Text>
              <InfoTip
                content="Choose which columns to keep. You can leave columns unmapped later in Style, but hiding them here keeps things tidy."
                positioning={{ placement: "right" }}
              />
            </HStack>
            {columnsLoading ? (
              <Skeleton height="8em" />
            ) : columnsError ? (
              <ErrorMsg message={columnsError} />
            ) : (
              <>
                <Checkbox.Root
                  checked={headerMode === 'header'}
                  onCheckedChange={(e) => setHeaderMode(!!e.checked === true ? 'header' : 'no_header')}
                  mb="3"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>My file has a header row</Checkbox.Label>
                </Checkbox.Root>
                <VStack
                  align="stretch"
                  gap="1"
                  borderWidth="1px"
                  borderRadius="md"
                  p="3"
                >
                  {columns.map((col) => (
                    <HStack key={col.name} justify="space-between">
                      <Checkbox.Root
                        checked={selectedColumns.has(col.name)}
                        onCheckedChange={(e) =>
                          handleToggleColumn(col.name, !!e.checked)
                        }
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>
                          {col.name}
                        </Checkbox.Label>
                      </Checkbox.Root>
                      {col.NaNs > 0 && (
                        <Badge colorPalette="orange" size="sm" gap="1">
                          <LuTriangleAlert />
                          Missing values
                        </Badge>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </>
            )}
          </Box>

          {/* Missing values */}
          {!columnsLoading && hasNanColumns && (
            <Box animation="fade-in 300ms ease-out">
              <HStack mb="2">
                <Text fontWeight="bold">Missing values</Text>
                <InfoTip
                  content="One or more selected columns contain missing values. Choose how they should be handled before sonifying."
                  positioning={{ placement: "right" }}
                />
              </HStack>
              <RadioCard.Root
                value={nanStrategy}
                colorPalette="teal"
                onValueChange={(e) => setNanStrategy(e.value as NanStrategy)}
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

              {nanStrategy === "fill" && (
                <Field.Root width="auto" mt="3">
                  <Field.Label>Fill value</Field.Label>
                  <Input
                    value={fillValue}
                    onChange={(e) => setFillValue(e.target.value)}
                    width="150px"
                  />
                </Field.Root>
              )}
            </Box>
          )}

          {/* Row range */}
          {!columnsLoading && (
            <Box>
              <HStack mb="2">
                <Text fontWeight="bold">Row range</Text>
                <InfoTip
                  content="Limit the sonification to a subset of rows, e.g. to exclude header junk or shorten a large file."
                  positioning={{ placement: "right" }}
                />
              </HStack>
              <Slider.Root
                w="100%"
                step={1}
                colorPalette="teal"
                min={0}
                max={totalRows}
                value={rowRange}
                minStepsBetweenThumbs={1}
                onValueChange={(e) => setRowRange(e.value as [number, number])}
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumbs />
                </Slider.Control>
              </Slider.Root>
              <Text fontSize="sm" color="fg.muted" mt="1">
                Rows {rowRange[0] + 1}–{rowRange[1]} of {totalRows}
              </Text>
            </Box>
          )}

          <Button
            w={{ base: "100%", sm: "auto" }}
            onClick={handleApply}
            colorPalette="teal"
            loading={applyLoading}
            loadingText="Saving..."
            disabled={columnsLoading || selectedColumns.size === 0}
          >
            Apply & Continue <LuArrowRight />
          </Button>
        </VStack>
      </Box>

      <Box flex="1" width="100%">
        <VStack align="stretch" gap="3">
          {!columnsLoading && (
            <Text fontSize="sm" color="fg.muted">
              {totalRows} rows · {columns.length} columns
              {hasNanColumns &&
                ` · ${columns.filter((c) => selectedColumns.has(c.name) && c.NaNs > 0).length} with missing values`}
            </Text>
          )}

          {previewLoading ? (
            <LoadingMessage msg="Generating preview..." icon="pulsar" />
          ) : previewError ? (
            <ErrorMsg message={previewError} />
          ) : previewRows.length > 0 ? (
            <Box overflowX="auto" animation="fade-in 300ms ease-out">
              <Table.Root size="sm" interactive>
                <Table.Header>
                  <Table.Row>
                    {Array.from(selectedColumns).map((col) => (
                      <Table.ColumnHeader key={col} fontWeight="bold">
                        {col}
                      </Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {previewRows.map((row, i) => (
                    <Table.Row key={i}>
                      {Array.from(selectedColumns).map((col) => (
                        <Table.Cell key={col}>
                          {String(row[col] ?? "")}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          ) : (
            <ErrorMsg message="No preview available." />
          )}
        </VStack>
      </Box>
    </Stack>
  );
}
