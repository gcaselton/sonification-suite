import { lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageContainer from "../ui/PageContainer";
import { Box, Heading, Text, Highlight, Separator } from "@chakra-ui/react";
import { useComposer } from "../../context/ComposerContext";
import { NavigationState } from "../../types/navigation";
import { ApplyResult } from "../../types/refine_menu";

export default function Refine() {
  const navigate = useNavigate();
  const location = useLocation();
  const composer = useComposer();

  const dataName = location.state.dataName;
  const sourceDataRef = location.state.sourceDataRef;
  const soniType = location.state.soniType;
  const ra = location.state.ra ?? null;
  const dec = location.state.dec ?? null;
  const userUpload = location.state.userUpload ?? false;
  const layerID = location.state.layerID ?? null;
  const idColumn = location.state.idColumn ?? null;
  const isAsterism = location.state.isAsterism ?? false;

  // Dynamically import the menu component
  const Menu = lazy(() => import(`../refine_menus/${soniType}.tsx`));

  return (
    <PageContainer>
      <Heading as="h1">Step 2: Refine</Heading>
      <br />
      <Text textStyle="lg">
        <Highlight query={dataName} styles={{ color: "teal.600" }}>
          {`Optionally, edit the ${dataName} dataset`}
        </Highlight>
      </Text>
      <br />
      <Suspense>
        <Menu
          dataRef={sourceDataRef}
          dataName={dataName}
          isAsterism={isAsterism}
          idColumn={idColumn}
          onApply={(result: ApplyResult) => {
            const { newRef, idColumn, newRa, newDec, nStars } = result;

            // Go back to Data Composer with new data ref if we came from there
            if (soniType === "data_composer") {
              composer.updateLayer(layerID, {
                dataRef: newRef,
                idColumn: idColumn,
                refined: true,
              });

              navigate("/planetaria/data-composer");
              return;
            }

            // Otherwise, proceed to Style
            const state: NavigationState = {
              ...location.state,
              dataRef: newRef,
              ra: newRa ?? ra,
              dec: newDec ?? dec,
              userUpload,
              nStars: nStars
            };
            navigate("/planetaria/style", { state });
          }}
        />
      </Suspense>
    </PageContainer>
  );
}
