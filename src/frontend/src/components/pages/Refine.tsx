import { lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageContainer from "../ui/PageContainer";
import { Box, Heading, Text } from "@chakra-ui/react";
import { useComposer } from "../../context/ComposerContext";

export default function Refine() {
  const navigate = useNavigate();
  const location = useLocation();
  const composer = useComposer();
  
  const dataName = location.state.dataName;
  const dataRef = location.state.dataRef;
  const soniType = location.state.soniType;
  const ra = location.state.ra ?? null;
  const dec = location.state.dec ?? null;
  const userUpload = location.state.userUpload ?? false;
  const layerID = location.state.layerID ?? null;

  // Dynamically import the menu component
  const Menu = lazy(() => import(`../refine_menus/${soniType}.tsx`));

  return (
    <PageContainer>
      <Heading as="h1">Step 2: Refine</Heading>
      <br />
      <Text textStyle="lg">Optionally, edit the {dataName} dataset</Text>
      <br />
      <br />
      <Suspense>
        <Menu
          dataRef={dataRef}
          dataName={dataName}
          onApply={(newRef: string, newRa?: number, newDec?: number) => {
            // Navigate with refined data
            console.log(soniType)

            // Go back to Data Composer with new data ref if we came from there
            if (soniType === 'data_composer') {
              composer.updateLayer(layerID, {
                dataRef: newRef,
                refined: true,
              })

              navigate("/data-composer");
              return;
            }

            // Otherwise, proceed to Style 
            navigate("/style", {
              state: {
                dataRef: newRef,
                dataName,
                soniType,
                ra: newRa ?? ra,
                dec: newDec ?? dec,
                userUpload,
              },
            });
          }}
        />
      </Suspense>
    </PageContainer>
  );
}
