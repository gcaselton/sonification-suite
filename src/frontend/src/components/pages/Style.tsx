import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StyleCard from "../ui/StyleCard";
import PageContainer from "../ui/PageContainer";
import CustomStyleMenu from "../utils/CustomStyleMenu";
import { coreAPI } from "../../apiConfig";
import { apiRequest } from "../../utils/requests";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { useComposer } from "../../context/ComposerContext";

export default function Style() {
  const navigate = useNavigate();
  const composer = useComposer();

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

  // Custom style menu open/close
  const [customOpen, setCustomOpen] = useState(false);

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

    }

  }, [])

  const convertStyleToSettings = async (styleRef: string) => {

  }

  const handleSelectStyle = (style: any) => {
    if (style.name === "Custom") {
      setCustomOpen(true);
      return;
    }

    if (soniType === "data_composer") {
      goToComposer(style.file_ref, style.name, style.description);
      return;
    }

    goToSonify(style.file_ref, style.name, style.description);
  };

  const handleStyleCreated = (styleRef: string) => {

    if (soniType === "data_composer") {
      goToComposer(styleRef, "Custom", "");
      return;
    }

    goToSonify(styleRef, "Custom", "");
  };

  const goToSonify = (styleRef: string, styleName: string, styleDescription: string) => {
    navigate("/planetaria/sonify", {
      state: {
        dataName,
        dataRef,
        styleRef,
        styleName,
        styleDescription,
        soniType,
        ra,
        dec,
      },
    });
  }

  const goToComposer = (styleRef: string, styleName: string, styleDescription: string) => {
    composer.updateLayer(layerID, {
      styleRef,
      styleName,
      styleDescription
    })

    navigate("/planetaria/data-composer");
  }

  const onFileSelect = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest(`${coreAPI}/upload-yaml/`, formData);
      const styleRef = res.file_ref;
      navigate("/planetaria/sonify", {
        state: { dataName, dataRef, styleRef, soniType, ra, dec },
      });
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
              style={{ cursor: "pointer" }}
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
      />
    </PageContainer>
  );
}
