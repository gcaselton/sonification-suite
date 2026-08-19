import { HStack, Flex, Text, IconButton } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { LuGripVertical } from "react-icons/lu";

export interface Star {
  id: string;
  label: string;
}

export function SortableStarItem({ star, order }: { star: Star; order: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: star.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <HStack
      ref={setNodeRef}
      style={style}
      gap="3"
      p="2"
      borderWidth="1px"
      borderRadius="md"
      bg={isDragging ? "bg.muted" : "bg.panel"}
      opacity={isDragging ? 0.6 : 1}
    >
      <Flex
        align="center"
        justify="center"
        minW="6"
        h="6"
        borderRadius="full"
        bg="teal.500"
        color="white"
        fontSize="xs"
        fontWeight="bold"
      >
        {order}
      </Flex>
      <Text flex="1">{star.label}</Text>
      <IconButton
        aria-label={`Reorder ${star.label}`}
        variant="ghost"
        size="sm"
        {...attributes}
        {...listeners}
        cursor="grab"
      >
        <LuGripVertical />
      </IconButton>
    </HStack>
  );
}
