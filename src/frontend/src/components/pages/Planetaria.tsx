import { useNavigate } from "react-router-dom";
import PageContainer from "../ui/PageContainer";
import { getImage } from "../../utils/assets";
import { LuExternalLink, LuFilm, LuLayers3, LuStar } from "react-icons/lu";

import {
  Box,
  Card,
  LinkOverlay,
  Link,
  Icon,
  Stack,
  Heading,
  Text,
  HStack,
  Badge,
} from "@chakra-ui/react";

interface AstroType {
  name: string;
  description: string;
  page?: string;
  href?: string;
  icon?: React.ElementType;
}

const astroTypes: AstroType[] = [
  {
    name: "Light Curves",
    description: "Listen to fluctuations in a star's light.",
    page: "light-curves",
  },
  {
    name: "Constellations",
    description: "Hear the unique qualities of famous star patterns.",
    page: "constellations",
  },
  {
    name: "Night Sky",
    description: "Hear the stars at your location appear.",
    page: "night-sky",
  },
  {
    name: "Data Composer",
    description: "Upload your own data and compose sonifications in layers.",
    page: "/data-composer",
    icon: LuLayers3,
  },
  {
    name: "Suggestions & Examples",
    description: "Pre-made examples and suggestions for using the Suite.",
    href: "https://www.audiouniverse.org/sonification-suite/suggestions-and-example-bank",
    icon: LuFilm,
  },
];

export default function Planetaria() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <Heading as="h1">Planetaria</Heading>
      <br />
      <HStack flexWrap="nowrap">
        <Text textStyle="lg" flexShrink={1}>
          Select a data source to sonify
        </Text>
      </HStack>
      <br />
      <br />
      <Stack
        gap="4"
        direction="row"
        wrap="wrap"
        justify={{ base: "center", md: "flex-start" }}
        animation="fade-in 300ms ease-out"
      >
        {astroTypes.map((astroType) => {
          const isExternal = !!astroType.href;

          return (
            <Card.Root
              width="200px"
              key={astroType.name}
              _hover={{ transform: "scale(1.05)" }}
              transition="transform 0.2s ease"
              variant={isExternal ? "subtle" : "elevated"}
            >
              <LinkOverlay
                as={Link}
                href={astroType.href}
                onClick={
                  !isExternal && astroType.page
                    ? () => navigate(astroType.page!)
                    : undefined
                }
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                cursor="pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();

                    if (isExternal) {
                      window.open(
                        astroType.href,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    } else if (astroType.page) {
                      navigate(astroType.page);
                    }
                  }
                }}
              >
                {astroType.icon ? (
                  <Box
                    height="200px"
                    width="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="8px"
                  >
                    <Icon boxSize="64px" color="teal.500">
                      <astroType.icon />
                    </Icon>
                  </Box>
                ) : (
                  <img
                    src={getImage(astroType.name)}
                    alt={astroType.name}
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                )}
              </LinkOverlay>

              <Card.Body>
                <Card.Title mb="2">
                  {astroType.name}
                  {isExternal && (
                    <Icon ml="3" mb="1" boxSize="4" color="gray.500">
                      <LuExternalLink />
                    </Icon>
                  )}
                </Card.Title>
                {astroType.name === "Constellations" && (
                  <Badge
                    animation="scale-in 500ms ease-out"
                    colorPalette="teal"
                    width="fit-content"
                    alignSelf="center"
                    mb="2"
                  >
                    <LuStar />
                    Now with Asterisms!
                  </Badge>
                )}
                <Card.Description>{astroType.description}</Card.Description>
              </Card.Body>
            </Card.Root>
          );
        })}
      </Stack>
    </PageContainer>
  );
}
