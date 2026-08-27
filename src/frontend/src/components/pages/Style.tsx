import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StyleCard from "../ui/StyleCard";
import PageContainer from "../ui/PageContainer";
import CustomStyleMenu from "../utils/CustomStyleMenu";
import { coreAPI } from "../../apiConfig";
import { apiRequest } from "../../utils/requests";

import { Box, Heading, Stack, Text, Dialog, Portal, Button, CloseButton } from "@chakra-ui/react";
import { useComposer, useOptionalComposer } from "../../context/ComposerContext";
import { NavigationState } from "../../types/navigation";

export default function Style() {
  const navigate = useNavigate();
  const composer = useOptionalComposer();

  // Location and state
  const location = useLocation();
  const dataName = location.state.dataName;
  const dataRef = location.state.dataRef;
  const soniType = location.state.soniType;
  const ra = location.state.ra ?? null;
  const dec = location.state.dec ?? null;
  const userUpload = location.state.userUpload;
  const layerID = location.state.layerID ?? null;
  const editStyle = location.state.editStyle ?? null;
  const nStars = location.state.nStars ?? 0;

  // Custom style menu open/close
  const [customOpen, setCustomOpen] = useState(false);

  const [orchestraWarnOpen, setOrchestraWarnOpen] = useState(false);
  const [pendingStyle, setPendingStyle] = useState<any | null>(null);

  // Suggested styles
  const [suggestedStyles, setSuggestedStyles] = useState<any[]>([]);

  // Reference to the hidden file input
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Get the relevant styles from the backend on first load
  useEffect(() => {
    fetch(`${coreAPI}/styles/${soniType}`)
      .then((res) => res.json())
      .then((data) => {
        data.push({ name: "Custom" });
        setSuggestedStyles(data);
      })
      .catch((err) => {
        console.error("Failed to fetch presets:", err);
      });
  }, []);

  useEffect(() => {
    if (editStyle) {
      setCustomOpen(true)
    }

  }, [])

  

  const handleSelectStyle = (style: any) => {
    if (style.name === "Custom") {
      setCustomOpen(true);
      return;
    }

    // Open warning for Orchestra constellations Style with lots of stars
    if (soniType === 'constellations' && style.name === "Orchestra" && Number(nStars) >= 100) {
      setPendingStyle(style);
      setOrchestraWarnOpen(true);
      return;
    }

    if (soniType === "data_composer") {
      goToComposer(style.file_ref, style.name, style.description);
      return;
    }

    goToSonify(style.file_ref, style.name, style.description);
  };

  const continueWithStyle = () => {
    if (!pendingStyle) return;

    const style = pendingStyle;

    setOrchestraWarnOpen(false);
    setPendingStyle(null);

    goToSonify(style.file_ref, style.name, style.description);
  };

  const handleStyleCreated = (styleRef: string, styleName: string = 'Custom', styleDescription: string = "") => {

    if (soniType === "data_composer") {
      goToComposer(styleRef, styleName, styleDescription);
      return;
    }

    goToSonify(styleRef, styleName, styleDescription);
  };

  const goToSonify = (styleRef: string, styleName: string, styleDescription: string) => {
    const state: NavigationState = {
      ...location.state,
      dataName,
      dataRef,
      styleRef,
      styleName,
      styleDescription,
      soniType,
      userUpload,
      ra,
      dec,
    };
    navigate("../sonify", { state });
  }

  const goToComposer = (styleRef: string, styleName: string, styleDescription: string) => {
    if (!composer) {
      throw new Error("Data Composer requires ComposerProvider");
    }
    composer.updateLayer(layerID, {
      styleRef,
      styleName,
      styleDescription
    })

    const state: NavigationState = { ...location.state }
    navigate("/data-composer", { state });
  }

  const onFileSelect = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest(`${coreAPI}/upload-yaml/`, formData);
      const styleRef = res.file_ref;
      const state: NavigationState = {
        ...location.state,
        dataName,
        dataRef,
        styleRef,
        soniType,
        ra,
        dec,
      };
      navigate("../sonify", { state });
    } catch (err: any) {
      console.error("File upload failed:", err);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <PageContainer>
      <Heading as="h1">Step 3: Style</Heading>
      <br />
      <Text textStyle="lg">
        Choose from the styles below, or configure your own
      </Text>
      <br />

      <Stack
        gap="6"
        justify={{ base: "center", md: "flex-start" }}
        direction="row"
        wrap="wrap"
        animation="fade-in 300ms ease-out"
      >
        {suggestedStyles.map((style, index) => {
          const gradientClasses = [
            "gradient-aurora",
            "gradient-neon",
            "gradient-darkwave",
            "gradient-sunset",
            "gradient-ocean",
            "gradient-forest",
          ];
          const gradientClass =
            style.name === "Custom"
              ? "gradient-custom"
              : gradientClasses[index % gradientClasses.length];

          return (
            <Box
              key={style.name}
              onClick={() => {
                handleSelectStyle(style);
              }}
              cursor={"button"}
            >
              <StyleCard
                title={style.name}
                description={style.description}
                gradientClass={gradientClass}
                isCustom={style.name === "Custom"}
                onActivate={() => handleSelectStyle(style)}
              />
            </Box>
          );
        })}
      </Stack>

      {/* Hidden file input for YAML upload */}
      <input
        ref={inputRef}
        type="file"
        accept=".yaml,.yml"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <CustomStyleMenu
        open={customOpen}
        onOpenChange={setCustomOpen}
        soniType={soniType}
        dataRef={dataRef}
        userUpload={userUpload}
        onStyleCreated={handleStyleCreated}
        editStyle={editStyle}
      />
      <Dialog.Root
        open={orchestraWarnOpen}
        onOpenChange={(e) => setOrchestraWarnOpen(e.open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content colorPalette="teal">
              <Dialog.Header>
                <Dialog.Title>Large number of stars</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <Text>
                  The Orchestra style uses long sustained notes, which may take several minutes to generate when
                  using a large number of stars.
                </Text>
                <Text mt="3">Are you sure you want to continue?</Text>
              </Dialog.Body>

              <Dialog.Footer justifyContent="center">
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>

                <Button onClick={continueWithStyle}>Patience is a virtue</Button>
              </Dialog.Footer>

              <Dialog.CloseTrigger asChild>
                <CloseButton
                  variant="ghost"
                  size="sm"
                  position="absolute"
                  top="2"
                  right="2"
                />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </PageContainer>
  );
}
