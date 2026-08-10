import { Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Breadcrumb, Menu, Portal, HStack, Text, Box } from "@chakra-ui/react";
import { LuChevronDown } from "react-icons/lu";

const DATA_TYPES = [
  { label: "Light Curves", soniType: "light_curves", path: "/planetaria/light-curves" },
  {
    label: "Constellations",
    soniType: "constellations",
    path: "/planetaria/constellations",
  },
  { label: "Night Sky", soniType: "night_sky", path: "/planetaria/night-sky" },
  { label: "Data Composer", soniType: "data_composer", path: "/planetaria/data-composer" },
];

interface Step {
  label: string;
  path: string;
  state?: unknown;
  isMenu?: boolean;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const state = location.state as
    | {
        soniType?: string;
        dataName?: string;
        dataRef?: string;
        ra?: number;
        dec?: number;
        userUpload?: boolean;
      }
    | undefined;

  if (pathname === "/") return null;

  const dataTypeFromPath = DATA_TYPES.find((d) => d.path === pathname);
  const soniType = dataTypeFromPath?.soniType ?? state?.soniType ?? null;
  if (!soniType && pathname !== '/planetaria') return null; // unknown route — nothing sensible to show

  const currentDataType = DATA_TYPES.find((d) => d.soniType === soniType);
  const isComposer = soniType === "data_composer";

  const steps: Step[] = [{ label: "Planetaria", path: "/planetaria" }];

  if (currentDataType) {
    steps.push({
      label: currentDataType.label,
      path: currentDataType.path,
      isMenu: true,
    });
  }

  if (pathname === "/planetaria/refine") {
    steps.push({ label: "Refine", path: "/planetaria/refine", state });
  }
  if (pathname === "/planetaria/style") {
    if (!isComposer) {
      steps.push({ label: "Refine", path: "/planetaria/refine", state });
    }
    steps.push({ label: "Style", path: "/planetaria/style", state });
  }
  if (pathname === "/planetaria/sonify") {
    if (!isComposer) {
      steps.push({ label: "Refine", path: "/planetaria/refine", state });
      steps.push({ label: "Style", path: "/planetaria/style", state });
    }
    steps.push({ label: "Sonify", path: "/planetaria/sonify", state });
  }

  return (
    <Box overflowX="auto" whiteSpace="nowrap">
      <Breadcrumb.Root size='lg' colorPalette='teal'>
        <Breadcrumb.List>
          {steps.map((step, i) => {
            const isCurrent = i === steps.length - 1;

            return (
              <Fragment key={`${step.path}-${i}`}>
                <Breadcrumb.Item fontSize="lg">
                  {isCurrent ? (
                    <Breadcrumb.CurrentLink color="teal.500">
                      {step.label}
                    </Breadcrumb.CurrentLink>
                  ) : step.isMenu ? (
                    <Menu.Root>
                      <Menu.Trigger asChild>
                        <HStack
                          as="button"
                          gap="1"
                          opacity={0.7}
                          _hover={{ opacity: 1 }}
                          transition="opacity 0.15s ease"
                          cursor="pointer"
                        >
                          <Text>{step.label}</Text>
                          <LuChevronDown size={16} />
                        </HStack>
                      </Menu.Trigger>
                      <Portal>
                        <Menu.Positioner>
                          <Menu.Content>
                            {DATA_TYPES.map((dt) => (
                              <Menu.Item
                                key={dt.soniType}
                                value={dt.soniType}
                                onClick={() => navigate(dt.path)}
                              >
                                {dt.label}
                              </Menu.Item>
                            ))}
                          </Menu.Content>
                        </Menu.Positioner>
                      </Portal>
                    </Menu.Root>
                  ) : (
                    <Breadcrumb.Link
                      onClick={() =>
                        navigate(
                          step.path,
                          step.state ? { state: step.state } : undefined,
                        )
                      }
                      cursor="pointer"
                      opacity={0.7}
                      _hover={{ opacity: 1 }}
                      transition="opacity 0.15s ease"
                    >
                      {step.label}
                    </Breadcrumb.Link>
                  )}
                </Breadcrumb.Item>
                {!isCurrent && <Breadcrumb.Separator>/</Breadcrumb.Separator>}
              </Fragment>
            );
          })}
        </Breadcrumb.List>
      </Breadcrumb.Root>
    </Box>
  );
}