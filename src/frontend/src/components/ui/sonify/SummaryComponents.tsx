import {
  Accordion,
  Button,
  DataList,
  HStack,
  Heading,
  Menu,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuDownload, LuSettings } from "react-icons/lu";
import AudioDownloadButton from "../AudioDownloadButton";
import { Tooltip } from "../Tooltip";
import { coreAPI } from "../../../apiConfig";

export interface SummaryRow {
  label: string;
  value: string;
  downloadable: boolean;
  fileRef?: string;
}

export interface SummaryData {
  layerLabel?: string;
  rows: SummaryRow[];
}

export interface AudioSystemProps {
  audioKey: string;
  generatedAudioSystem: string;
  soniReady: boolean;
}

interface LayerContentProps {
  summary: SummaryData;
  altAz: string[] | null;
  formatCoord: (coord: string) => string;
  handleEditStyle: (fileRef: string) => void;
}

export const LayerContent = ({
  summary,
  altAz,
  formatCoord,
  handleEditStyle,
}: LayerContentProps) => (
  <DataList.Root
    orientation="horizontal"
    divideY="1px"
    variant="bold"
    w="100%"
    pb={4}
  >
    {summary.rows.map(
      (row) =>
        row.value !== "" && (
          <DataList.Item key={row.label} pt="4" width="100%">
            <DataList.ItemLabel fontWeight="bold">
              {row.label}
            </DataList.ItemLabel>
            <DataList.ItemValue>
              <HStack justify="space-between" w="100%">
                <Text>{row.value}</Text>
                {row.downloadable && row.fileRef && (
                  <>
                    {row.label === "Style" && row.value === "Custom" && (
                      <Tooltip content="Open in the custom style menu">
                        <Button
                          size="sm"
                          colorPalette="teal"
                          variant="subtle"
                          onClick={() => handleEditStyle(row.fileRef!)}
                        >
                          <LuSettings /> Edit
                        </Button>
                      </Tooltip>
                    )}
                  </>
                )}
              </HStack>
            </DataList.ItemValue>
          </DataList.Item>
        ),
    )}

    {altAz && (
      <>
        <DataList.Item key="altitude" pt="4">
          <DataList.ItemLabel fontWeight="bold">Altitude</DataList.ItemLabel>
          <DataList.ItemValue>{formatCoord(altAz[0])}°</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item key="azimuth" pt="4">
          <DataList.ItemLabel fontWeight="bold">Azimuth</DataList.ItemLabel>
          <DataList.ItemValue>{formatCoord(altAz[1])}°</DataList.ItemValue>
        </DataList.Item>
      </>
    )}
  </DataList.Root>
);

interface LayerDownloadMenuProps {
  summary: SummaryData;
}

export const LayerDownloadMenu = ({
  summary,
}: LayerDownloadMenuProps) => {
  const downloadable = summary.rows.filter((r) => r.downloadable && r.fileRef);
  if (downloadable.length === 0) return null;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="sm" colorPalette="teal" variant="subtle">
          <LuDownload /> Download
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content>
          {downloadable.map((row) => (
            <Menu.Item key={row.label} value={row.label} asChild>
              <a
                href={`${coreAPI}/download?file_ref=${encodeURIComponent(row.fileRef!)}`}
                style={{ color: "inherit" }}
              >
                {row.label}
              </a>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
};

interface LayerHeaderProps {
  summary: SummaryData;
  i: number;
  audioSystem: AudioSystemProps;
}

export const LayerHeader = ({
  summary,
  i,
  audioSystem,
}: LayerHeaderProps) => (
  <HStack justify="space-between" w="100%">
    <HStack gap={4}>
      <Heading textAlign="center" size="md" color="teal">
        {summary.layerLabel}
      </Heading>
      {audioSystem.soniReady && (
        <AudioDownloadButton
          audioFileRef={`session:layer_${i + 1}.wav`}
          audioKey={audioSystem.audioKey}
          audioSystem={audioSystem.generatedAudioSystem}
          variant="subtle"
          size="sm"
          iconOnly
        />
      )}
    </HStack>
    <LayerDownloadMenu summary={summary} />
  </HStack>
);

interface SummaryListProps {
  summaries: SummaryData[];
  layers: boolean;
  altAz: string[] | null;
  formatCoord: (coord: string) => string;
  handleEditStyle: (fileRef: string) => void;
  audioSystem: AudioSystemProps;
}

/**
 * Renders the full Summary section. Uses an Accordion when there's more
 * than one layer; renders a single flat layer with no collapse wrapper
 * otherwise, since forcing an accordion around one item is just friction.
 */
export const SummaryList = ({
  summaries,
  layers,
  altAz,
  formatCoord,
  handleEditStyle,
  audioSystem,
}: SummaryListProps) => {
  const isMultiLayer = summaries.length > 1;

  return (
    <VStack w="100%">
      <HStack w="100%">
        <Separator w="100%" size="lg" />
        <Text flexShrink="0">Summary</Text>
        <Separator w="100%" size="lg" />
      </HStack>

      {isMultiLayer ? (
        <Accordion.Root
          multiple
          defaultValue={
            summaries[0]?.layerLabel ? [summaries[0].layerLabel] : []
          }
          w="100%"
        >
          {summaries.map((summary, i) => (
            <Accordion.Item
              key={summary.layerLabel ?? i}
              value={summary.layerLabel ?? String(i)}
            >
              <Accordion.ItemTrigger>
                <LayerHeader
                  summary={summary}
                  i={i}
                  audioSystem={audioSystem}
                />
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent pb={4}>
                <LayerContent
                  summary={summary}
                  altAz={altAz}
                  formatCoord={formatCoord}
                  handleEditStyle={handleEditStyle}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      ) : (
        summaries.map((summary, i) => (
          <VStack key={summary.layerLabel ?? i} w="100%" gap={2}>
            {layers && (
              <LayerHeader
                summary={summary}
                i={i}
                audioSystem={audioSystem}
              />
            )}
            <LayerContent
              summary={summary}
              altAz={altAz}
              formatCoord={formatCoord}
              handleEditStyle={handleEditStyle}
            />
          </VStack>
        ))
      )}
    </VStack>
  );
};
