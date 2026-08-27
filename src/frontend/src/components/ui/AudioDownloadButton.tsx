import {
  Button,
  ButtonProps,
  IconButton,
  Menu,
  Portal,
  Toast,
} from "@chakra-ui/react";
import { LuDownload } from "react-icons/lu";
import { coreAPI } from "../../apiConfig";
import { Tooltip } from "./Tooltip";


interface AudioDownloadButtonProps {
  audioFileRef: string;
  audioKey: string | number;
  audioSystem: string;
  onDownload: () => void;
}

const downloadFormats = ["wav", "mp3"] as const;

export default function AudioDownloadButton({
  audioFileRef,
  audioKey,
  audioSystem,
  onDownload,
}: AudioDownloadButtonProps) {
  return (

    <Menu.Root>
      <Menu.Trigger asChild>
        <Button colorPalette="teal" >
          <LuDownload /> Download
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {downloadFormats.map((format) => {
              const mp3Disabled =
                format === "mp3" && !["stereo", "mono"].includes(audioSystem);

              return (
                <Tooltip
                  disabled={!mp3Disabled}
                  content="MP3 is only available for Mono or Stereo audio."
                >
                  <Menu.Item value={format} asChild disabled={mp3Disabled} onClick={onDownload}>
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
}
