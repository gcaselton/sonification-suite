import { Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Breadcrumb, Box } from "@chakra-ui/react";
import { NavigationState } from "../../types/navigation";

const DATA_TYPES = [
  {
    label: "Light Curves",
    soniType: "light_curves",
    path: "/planetaria/light-curves",
  },
  {
    label: "Constellations",
    soniType: "constellations",
    path: "/planetaria/constellations",
  },
  {
    label: "Night Sky",
    soniType: "night_sky",
    path: "/planetaria/night-sky",
  },
  {
    label: "Data Composer",
    soniType: "data_composer",
    path: "/data-composer",
  },
];

interface Step {
  label: string;
  path: string;
  state?: unknown;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const state = location.state as NavigationState | undefined;

  if (pathname === "/") return null;

  // Work out which workflow we're in
  const isDataComposer =
    pathname === "/data-composer" || pathname.startsWith("/data-composer/");

  const isPlanetaria =
    pathname === "/planetaria" || pathname.startsWith("/planetaria/");

  if (!isDataComposer && !isPlanetaria) return null;

  // Determine the sonification type.
  // On the initial data page we can get it from the pathname.
  // On Refine/Style/Sonify it comes from navigation state.
  const dataTypeFromPath = DATA_TYPES.find((d) => d.path === pathname);

  const soniType =
    dataTypeFromPath?.soniType ??
    state?.soniType ??
    (isDataComposer ? "data_composer" : null);

  const currentDataType = DATA_TYPES.find((d) => d.soniType === soniType);

  const isRefine = pathname.endsWith("/refine");
  const isStyle = pathname.endsWith("/style");
  const isSonify = pathname.endsWith("/sonify");

  const steps: Step[] = [];

  // -----------------------------
  // Data Composer
  // -----------------------------
  if (isDataComposer) {
    steps.push({
      label: "Data Composer",
      path: "/data-composer",
    });

    if (isRefine) {
      steps.push({
        label: "Refine",
        path: "/data-composer/refine",
        state,
      });
    }

    if (isStyle) {
      steps.push({
        label: "Style",
        path: "/data-composer/style",
        state,
      });
    }

    if (isSonify) {
      steps.push({
        label: "Sonify",
        path: "/data-composer/sonify",
        state,
      });
    }
  }

  // -----------------------------
  // Planetaria
  // -----------------------------
  if (isPlanetaria) {
    steps.push({
      label: "Planetaria",
      path: "/planetaria",
    });

    if (currentDataType) {
      steps.push({
        label: currentDataType.label,
        path: currentDataType.path,
      });
    }

    if (isRefine) {
      steps.push({
        label: "Refine",
        path: "/planetaria/refine",
        state,
      });
    }

    if (isStyle) {
      steps.push({
        label: "Refine",
        path: "/planetaria/refine",
        state,
      });

      steps.push({
        label: "Style",
        path: "/planetaria/style",
        state,
      });
    }

    if (isSonify) {
      steps.push({
        label: "Refine",
        path: "/planetaria/refine",
        state,
      });

      steps.push({
        label: "Style",
        path: "/planetaria/style",
        state,
      });

      steps.push({
        label: "Sonify",
        path: "/planetaria/sonify",
        state,
      });
    }
  }

  if (steps.length === 0) return null;

  return (
    <Box overflowX="auto" whiteSpace="nowrap">
      <Breadcrumb.Root size="lg" colorPalette="teal">
        <Breadcrumb.List>
          {steps.map((step, i) => {
            const isCurrent = i === steps.length - 1;

            return (
              <Fragment key={`${step.path}-${i}`}>
                <Breadcrumb.Separator />
                <Breadcrumb.Item fontSize="lg">
                  {isCurrent ? (
                    <Breadcrumb.CurrentLink color="teal.500">
                      {step.label}
                    </Breadcrumb.CurrentLink>
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
              </Fragment>
            );
          })}
        </Breadcrumb.List>
      </Breadcrumb.Root>
    </Box>
  );
}
