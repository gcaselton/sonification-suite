import { Badge, Spinner, Text, Box } from "@chakra-ui/react";
import { LuTriangleAlert } from "react-icons/lu";
import type { Layer } from "../../types/layers";

interface ValidationBadgesProps {
  layer: Layer;
  validating: boolean;
}

export default function ValidationBadges({
  layer,
  validating,
}: ValidationBadgesProps) {
  const nMissing = layer.missingColumns.length;
  const nNan = layer.nanColumns.length;

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={validating}
    >
      {validating && (
        <Badge colorPalette="teal" gap="1">
          <Spinner size="xs" />
          Validating data...
        </Badge>
      )}

      {nMissing > 0 && (
        <Badge colorPalette="orange" gap="1">
          <LuTriangleAlert />
          <Text as="span">
            The{" "}
            <Text as="span" fontWeight="bold">
              {layer.styleName}
            </Text>{" "}
            style requires column{nMissing > 1 ? "s" : ""}{" "}
            <Text as="span" fontWeight="bold">
              {layer.missingColumns.join(", ")}
            </Text>
            , but {nMissing > 1 ? "they are" : "it is"} not present in this
            dataset.
          </Text>
        </Badge>
      )}

      {nNan > 0 && (
        <Badge colorPalette="orange" gap="1">
          <LuTriangleAlert />
          <Text as="span">
            Column{nNan > 1 ? "s" : ""}{" "}
            <Text as="span" fontWeight="bold">
              {layer.nanColumns.join(", ")}
            </Text>{" "}
            contain{nNan > 1 ? "" : "s"} non-numeric or missing data. Use{" "}
            <Text as="span" fontWeight="bold">
              Refine
            </Text>{" "}
            before continuing.
          </Text>
        </Badge>
      )}

      {layer.insufficientColumns && (
        <Badge colorPalette="orange" gap="1">
          <LuTriangleAlert />
          <Text as="span">
            The{" "}
            <Text as="span" fontWeight="bold">
              {layer.styleName}
            </Text>{" "}
            style requires{" "}
            <Text as="span" fontWeight="bold">
              {layer.insufficientColumns.style}
            </Text>{" "}
            columns, but{" "}
            <Text as="span" fontWeight="bold">
              {layer.dataName}
            </Text>{" "}
            only has{" "}
            <Text as="span" fontWeight="bold">
              {layer.insufficientColumns.data}
            </Text>
            .
          </Text>
        </Badge>
      )}
    </Box>
  );
}
