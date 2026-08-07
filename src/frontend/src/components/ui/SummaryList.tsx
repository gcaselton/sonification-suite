import { DataList, IconButton} from "@chakra-ui/react";
import { LuDownload } from "react-icons/lu";
import { coreAPI } from "../../apiConfig";
import { Tooltip } from "./Tooltip";

export interface SummaryItem {
  label: string;
  value: string;
  downloadable: boolean;
  fileRef?: string;
}

interface SummaryListProps {
  items: SummaryItem[]
}

export function SummaryList({ items }: SummaryListProps) {
  return (
    <DataList.Root
      orientation="horizontal"
      divideY="1px"
      variant="bold"
      w="100%"
    >
      {items.map((item) => (
        <DataList.Item key={item.label} pt="4">
          <DataList.ItemLabel fontWeight="bold">
            {item.label}
          </DataList.ItemLabel>

          <DataList.ItemValue>{item.value}</DataList.ItemValue>

          {item.downloadable && item.fileRef && (
            <DataList.ItemValue>
              <Tooltip content={`Download ${item.label.toLowerCase()}`}>
                <IconButton
                  aria-label={`Download ${item.label.toLowerCase()}`}
                  asChild
                  colorPalette="teal"
                  size="sm"
                  variant="ghost"
                >
                  <a
                    href={`${coreAPI}/download?file_ref=${encodeURIComponent(
                      item.fileRef,
                    )}`}
                    style={{ color: "inherit" }}
                  >
                    <LuDownload />
                  </a>
                </IconButton>
              </Tooltip>
            </DataList.ItemValue>
          )}
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}
