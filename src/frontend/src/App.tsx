import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider } from "./components/ui/color-mode";
import { Box } from "@chakra-ui/react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Lightcurves from "./components/pages/Lightcurves";
import Style from "./components/pages/Style";
import Sonify from "./components/pages/Sonify";
import Planetaria from "./components/pages/Planetaria";
import Landing from "./components/pages/Landing";
import Refine from "./components/pages/Refine";
import Constellations from "./components/pages/Constellations";
import DataComposer from "./components/pages/DataComposer";
import { useEffect, useState, useRef } from "react";
import { coreAPI } from "./apiConfig";
import NightSky from "./components/pages/NightSky";
import { ComposerProvider } from "./context/ComposerContext";
import ScrollToTop from "./utils/ScrollToTop";

function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const sessionInitialised = useRef(false);

  useEffect(() => {
    // runs once when the app first loads to get a session ID from backend

    if (sessionInitialised.current) return;
    sessionInitialised.current = true;

    async function setupSession() {
      const response = await fetch(`${coreAPI}/session/`, {
        credentials: "include", // Tell browser to send/save cookies
      });
      const data = await response.json();
      setSessionReady(true);
    }

    setupSession();
  }, []);

  if (!sessionReady) {
    return <div>Loading...</div>;
  }

  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider>
        <Box minH="100vh" bg="bg">
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/planetaria">
                <Route index element={<Planetaria />} />
                <Route path="light-curves" element={<Lightcurves />} />
                <Route path="constellations" element={<Constellations />} />
                <Route path="night-sky" element={<NightSky />} />
                <Route path="refine" element={<Refine />} />
                <Route path="style" element={<Style />} />
                <Route path="sonify" element={<Sonify />} />
              </Route>

              <Route
                path="/data-composer"
                element={
                  <ComposerProvider>
                    <Outlet />
                  </ComposerProvider>
                }
              >
                <Route index element={<DataComposer />} />
                <Route path="refine" element={<Refine />} />
                <Route path="style" element={<Style />} />
                <Route path="sonify" element={<Sonify />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </Box>
      </ColorModeProvider>
    </ChakraProvider>
  );
}

export default App;
