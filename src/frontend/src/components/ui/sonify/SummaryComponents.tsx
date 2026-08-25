import {
  Accordion,
  Button,
  DataList,
  HStack,
  Heading,
  Menu,
  Portal,
  Separator,
  Stat,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuDownload, LuSettings } from "react-icons/lu";
import { Tooltip } from "../Tooltip";
import { coreAPI } from "../../../apiConfig";
import { formatCoord } from "../../../utils/formatting";
import { useState } from "react";

export interface LayerSummary {
  layerLabel?: string;
  description: string;
  dataName: string;
  styleName: string;
  dataRef: string | null;
  styleRef: string | null;
}

interface LayerContentProps {
  summary: LayerSummary;
  altAz: string[] | null;
  handleEditStyle: (fileRef: string) => void;
}

interface LayerDownloadsProps {
  summary: LayerSummary;
  layerIndex?: number;
  soniReady: boolean;
  audioKey: string | number;
  audioSystem: string;
}

interface SummaryListProps {
  summaries: LayerSummary[];
  altAz: string[] | null;
  handleEditStyle: (fileRef: string) => void;
  soniReady: boolean;
  audioKey: string | number;
  audioSystem: string;
}

const downloadFormats = ["wav", "mp3"] as const;

const DownloadButton = ({
  label,
  fileRef,
  tooltip,
}: {
  label: string;
  fileRef: string | null;
  tooltip: string;
}) => {
  if (!fileRef) return null;

  return (
    <Tooltip content={tooltip}>
      <Button asChild size="sm" colorPalette="teal" variant="subtle">
        <a
          href={`${coreAPI}/download?file_ref=${encodeURIComponent(fileRef)}`}
          style={{ color: "inherit" }}
        >
          <LuDownload />
          {label}
        </a>
      </Button>
    </Tooltip>
  );
};

const AudioDownloadMenu = ({
  audioFileRef,
  audioKey,
  audioSystem,
  disabled,
  tooltip,
}: {
  audioFileRef: string;
  audioKey: string | number;
  audioSystem: string;
  disabled: boolean;
  tooltip: string;
}) => {
  const button = (
    <Button size="sm" colorPalette="teal" variant="subtle" disabled={disabled}>
      <LuDownload />
      Audio
    </Button>
  );

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Menu.Root
      open={menuOpen}
      onOpenChange={(details) => setMenuOpen(details.open)}
    >
      <Tooltip content={tooltip} disabled={menuOpen}>
        <span style={{ display: "inline-flex" }}>
          <Menu.Trigger asChild>{button}</Menu.Trigger>
        </span>
      </Tooltip>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {downloadFormats.map((format) => {
              const mp3Disabled =
                format === "mp3" && !["stereo", "mono"].includes(audioSystem);

              return (
                <Tooltip
                  key={format}
                  disabled={!mp3Disabled}
                  content="MP3 is only available for Mono or Stereo audio."
                >
                  <Menu.Item value={format} asChild disabled={mp3Disabled}>
                    <a
                      href={`${coreAPI}/audio/${audioFileRef}?format=${format}&v=${audioKey}`}
                    >
                      Download {format.toUpperCase()}
                    </a>
                  </Menu.Item>
                </Tooltip>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

export const LayerDownloads = ({
  summary,
  layerIndex,
  soniReady,
  audioKey,
  audioSystem,
}: LayerDownloadsProps) => {
  const i = layerIndex === undefined ? 0 : layerIndex
  const mappingTableButton = (
    <Button
      asChild={soniReady}
      size="sm"
      colorPalette="teal"
      variant="subtle"
      disabled={!soniReady}
    >
      {soniReady ? (
        <a
          href={`${coreAPI}/download?file_ref=${encodeURIComponent(
            `session:mapping_table_${String(i + 1)}.csv`
          )}`}
          style={{ color: "inherit" }}
        >
          <LuDownload />
          Mapping table
        </a>
      ) : (
        <>
          <LuDownload />
          Mapping table
        </>
      )}
    </Button>
  );

  return (
    <VStack w="100%" align="stretch" gap={2}>
      <Text fontWeight="bold" fontSize="sm">
        Downloads
      </Text>

      <HStack gap={2} wrap="wrap">
          <DownloadButton label="Data" fileRef={summary.dataRef} tooltip="Download data"/>

          <DownloadButton label="Style" fileRef={summary.styleRef} tooltip="Download style file"/>

        <Tooltip
          content={
            soniReady
              ? "Download a table showing the timing and sound parameters for each data point."
              : "Generate the sonification to download the mapping table."
          }
        >
          {mappingTableButton}
        </Tooltip>
        {layerIndex !== undefined && (
            <AudioDownloadMenu
              audioFileRef={`session:layer_${layerIndex + 1}.wav`}
              audioKey={audioKey}
              audioSystem={audioSystem}
              disabled={!soniReady}
              tooltip={
                soniReady
                  ? "Download layer audio"
                  : "Generate the sonification to download this layer's audio."
              }
            />
        )}
      </HStack>
    </VStack>
  );
};

export const LayerContent = ({
  summary,
  altAz,
  handleEditStyle,
}: LayerContentProps) => (
  <VStack w="100%" align="stretch" gap={5}>
    {summary.description.length > 0 && (
      <Text fontSize="sm" lineHeight="tall">
        {summary.description}
      </Text>
    )}
    <HStack
      w="100%"
      gap={0}
      divideX="1px"
      borderTopWidth="1px"
      borderBottomWidth="1px"
      py={3}
    >
      <Stat.Root flex="1" px={4} size="xs">
        <Stat.Label>Data</Stat.Label>
        <Stat.ValueText>{summary.dataName}</Stat.ValueText>
      </Stat.Root>

      <Stat.Root flex="1" px={4} size="xs">
        <Stat.Label>Style</Stat.Label>

        <HStack justify="space-between">
          <Stat.ValueText>{summary.styleName}</Stat.ValueText>

          {summary.styleName === "Custom" && summary.styleRef && (
            <Tooltip content="Open in the custom style menu">
              <Button
                size="xs"
                colorPalette="teal"
                variant="subtle"
                onClick={() => handleEditStyle(summary.styleRef!)}
              >
                <LuSettings />
                Edit
              </Button>
            </Tooltip>
          )}
        </HStack>
      </Stat.Root>
    </HStack>

    {altAz && (
      <HStack
        w="100%"
        gap={0}
        divideX="1px"
        borderTopWidth="1px"
        borderBottomWidth="1px"
        py={3}
      >
        <Stat.Root flex="1" px={4} size="sm">
          <Stat.Label>Altitude</Stat.Label>
          <Stat.ValueText>{formatCoord(altAz[0])}°</Stat.ValueText>
        </Stat.Root>

        <Stat.Root flex="1" px={4} size="sm">
          <Stat.Label>Azimuth</Stat.Label>
          <Stat.ValueText>{formatCoord(altAz[1])}°</Stat.ValueText>
        </Stat.Root>
      </HStack>
    )}
  </VStack>
);

export const SummaryList = ({
  summaries,
  altAz,
  handleEditStyle,
  soniReady,
  audioKey,
  audioSystem,
}: SummaryListProps) => {
  return (
    <VStack w="100%" align="stretch" gap={4}>
      <HStack w="100%">
        <Separator w="100%" size="lg" />
        <Text flexShrink="0">Summary</Text>
        <Separator w="100%" size="lg" />
      </HStack>

      {summaries.length > 1 ? (
        <Accordion.Root
          multiple
          collapsible
          defaultValue={
            summaries[0]?.layerLabel ? [summaries[0].layerLabel] : []
          }
          w="100%"
        >
          {summaries.map((summary, i) => {
            const value = summary.layerLabel ?? String(i);

            return (
              <Accordion.Item key={value} value={value}>
                <Accordion.ItemTrigger>
                  <Heading size="lg" color="teal">
                    {summary.layerLabel}
                  </Heading>
                  <Accordion.ItemIndicator />
                </Accordion.ItemTrigger>
                <Accordion.ItemContent pb={5} pt={2}>
                  <VStack w="100%" align="stretch" gap={5}>
                    <LayerContent
                      summary={summary}
                      altAz={altAz}
                      handleEditStyle={handleEditStyle}
                    />

                    <LayerDownloads
                      summary={summary}
                      layerIndex={i}
                      soniReady={soniReady}
                      audioKey={audioKey}
                      audioSystem={audioSystem}
                    />
                  </VStack>
                </Accordion.ItemContent>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      ) : (
        summaries.map((summary, i) => (
          <VStack
            key={summary.layerLabel ?? i}
            w="100%"
            align="stretch"
            gap={5}
          >
            <LayerContent
              summary={summary}
              altAz={altAz}
              handleEditStyle={handleEditStyle}
            />

            <LayerDownloads
              summary={summary}
              soniReady={soniReady}
              audioKey={audioKey}
              audioSystem={audioSystem}
            />
          </VStack>
        ))
      )}
    </VStack>
  );
};
