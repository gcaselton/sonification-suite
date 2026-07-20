import {
  Box,
  Flex,
  Text,
  Link,
  Icon,
  IconButton,
  HStack,
  VStack,
  Dialog,
  CloseButton,
} from "@chakra-ui/react";
import { useNavigate, NavLink } from "react-router-dom";
import { CircleQuestionMark, Info, Menu } from "lucide-react";
import { useState } from "react";
import { NavDrawer } from "./NavDrawer";

export default function PageContainer({
  children,
  nav = true,
}: {
  children: React.ReactNode;
  nav?: boolean;
}) {
  const [licenseOpen, setLicenseOpen] = useState(false);

  return (
    <Box maxW="1200px" mx="auto" px={6} py={4} width="100%">
      {/* Skip nav bar for screen reader/keyboard users*/}
      <Link
        href="#"
        position="absolute"
        width="1px"
        height="1px"
        padding={0}
        margin="-1px"
        overflow="hidden"
        clipPath="inset(50%)"
        whiteSpace="nowrap"
        border="0"
        bg="teal.500"
        color="white"
        zIndex={9999}
        _focus={{
          width: "auto",
          height: "auto",
          padding: "8px 16px",
          margin: 0,
          overflow: "visible",
          clipPath: "none",
          whiteSpace: "normal",
          top: 0,
          left: 0,
        }}
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById("main-content");
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        Skip to content
      </Link>

      {nav && (
        <>
          {/* Mobile Navigation */}
          <Flex as="header" display={{ base: "flex", md: "none" }} mb={6}>
            <NavDrawer />
          </Flex>
          {/* Desktop Navigation */}
          <Flex
            as="header"
            justify="space-between"
            align="center"
            mb={6}
            display={{ base: "none", md: "flex" }}
          >
            <Flex align="center" gap={2} wrap="wrap">
              <NavLink to="/" aria-label="Go to landing page">
                <Text
                  fontSize="lg"
                  cursor="pointer"
                  _hover={{ opacity: 0.8 }}
                  transition="opacity 0.15s ease"
                >
                  Sonification{" "}
                  <Box as="span" color="teal.500">
                    Suite
                  </Box>
                </Text>
              </NavLink>

              <Text opacity={0.35}>/</Text>

              <NavLink to="/planetaria" aria-label="Go to Planetaria home page">
                <Text
                  fontSize="lg"
                  opacity={0.6}
                  cursor="pointer"
                  _hover={{ opacity: 1 }}
                  transition="opacity 0.15s ease"
                >
                  Planetaria
                </Text>
              </NavLink>
            </Flex>
            <Flex gap={5}>
              <Link
                href="https://www.audiouniverse.org/sonification-suite/planetaria/about"
                style={{ textDecoration: "none" }}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Go to about page in new tab"
              >
                <HStack
                  opacity={0.5}
                  _hover={{ opacity: 1 }}
                  transition="opacity 0.15s ease"
                  cursor="pointer"
                  role="link"
                >
                  <Icon size="md">
                    <Info />
                  </Icon>
                  <Text fontSize="md">About</Text>
                </HStack>
              </Link>
              <Link
                href="https://www.audiouniverse.org/sonification-suite/planetaria"
                style={{ textDecoration: "none" }}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Go to help page in new tab"
              >
                <HStack
                  opacity={0.5}
                  _hover={{ opacity: 1 }}
                  transition="opacity 0.15s ease"
                  cursor="pointer"
                  role="button"
                >
                  <Icon size="md">
                    <CircleQuestionMark />
                  </Icon>
                  <Text fontSize="md">Help</Text>
                </HStack>
              </Link>
            </Flex>
          </Flex>
        </>
      )}
      {/* Main Content */}
      <Box as="main" id="main-content" tabIndex={-1} position="relative">
        {children}
      </Box>
      {/* Footer */}
      <Flex
        as="footer"
        mt={20}
        pt={6}
        borderTop="1px solid"
        borderColor="border"
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={4}
        opacity={0.5}
      >
        <Text
          aria-label="Open software license"
          fontSize="xs"
          as="button"
          cursor="pointer"
          _hover={{ opacity: 1 }}
          onClick={() => setLicenseOpen(true)}
        >
          License
        </Text>
        <Text fontSize="xs">
          Powered by{" "}
          <Link
            aria-label="Go to STRAUSS repository on GitHub"
            href="https://github.com/james-trayford/strauss"
            colorPalette="teal"
            target="_blank"
            rel="noopener noreferrer"
          >
            STRAUSS
          </Link>
        </Text>

        <Text fontSize="xs">v0.2 (Alpha)</Text>
      </Flex>
      <Dialog.Root
        open={licenseOpen}
        onOpenChange={(e) => setLicenseOpen(e.open)}
        placement="center"
        size="lg"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="80vh">
            <Dialog.Header>
              <Dialog.Title>GNU General Public License</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body overflowY="auto">
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm">
                  Copyright (C) 2026 Audio Universe Developers
                </Text>
                <Text fontSize="sm">
                  This program is free software: you can redistribute it and/or
                  modify it under the terms of the GNU General Public License as
                  published by the Free Software Foundation, either version 3 of
                  the License, or (at your option) any later version.
                </Text>
                <Text fontSize="sm">
                  This program is distributed in the hope that it will be
                  useful, but WITHOUT ANY WARRANTY; without even the implied
                  warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
                  PURPOSE. See the GNU General Public License for more details.
                </Text>
                <Link
                  href="https://www.gnu.org/licenses/gpl-3.0.en.html"
                  colorPalette="teal"
                  target="_blank"
                  rel="noopener noreferrer"
                  fontSize="sm"
                >
                  Read the full GNU GPL v3 license →
                </Link>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
