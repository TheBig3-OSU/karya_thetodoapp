import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import ButtonPage from "./pages/components/ButtonPage";
import BadgePage from "./pages/components/BadgePage";
import DialogPage from "./pages/components/DialogPage";
import TabsPage from "./pages/components/TabsPage";
import HouseOnboardingPage from "./pages/HouseOnboardingPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/house/new" element={<HouseOnboardingPage />} />
          <Route path="/components/button" element={<ButtonPage />} />
          <Route path="/components/badge" element={<BadgePage />} />
          <Route path="/components/dialog" element={<DialogPage />} />
          <Route path="/components/tabs" element={<TabsPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  </React.StrictMode>,
);
