import {
  Button,
  Drawer,
  Portal,
  IconButton,
  VStack,
  HStack,
  Text,
} from "@chakra-ui/react";
import {
  Menu,
  X,
  Home,
  Earth,
  User,
  Settings,
  Info,
  BarChart3,
  Mail,
  HelpCircle,
} from "lucide-react";

import { Link } from "react-router-dom";

export function NavDrawer() {
  const navItems = [
    { icon: Home, label: "Home", to: "/planetaria", external: false },
    {
      icon: Info,
      label: "About",
      to: "https://www.audiouniverse.org/sonification-suite/planetaria/about",
      external: true,
    },
    {
      icon: HelpCircle,
      label: "Help",
      to: "https://www.audiouniverse.org/sonification-suite/planetaria",
      external: true,
    },
  ];

  return (
    <Drawer.Root placement="start" size="xs">
      <Drawer.Trigger asChild>
        <IconButton variant="outline" aria-label="Open menu">
          <Menu />
        </IconButton>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <HStack justify="flex-end">
                <Drawer.CloseTrigger asChild>
                  <IconButton size="sm" variant="ghost" aria-label="Close menu">
                    <X size={16} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </HStack>
            </Drawer.Header>
            <Drawer.Body>
              <VStack align="start">
                {navItems.map((item) => (
                  <Link
                    to={item.to}
                    style={{ width: "100%" }}
                    key={item.label}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                  >
                    <Button
                      key={item.label}
                      variant="ghost"
                      justifyContent="flex-start"
                      w="full"
                      colorPalette="teal"
                    >
                      <HStack>
                        <item.icon size={18} />
                        <Text textStyle="md">{item.label}</Text>
                      </HStack>
                    </Button>
                  </Link>
                ))}
              </VStack>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
