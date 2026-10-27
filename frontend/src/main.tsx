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
import AvatarPage from "./pages/components/AvatarPage";
import ProgressPage from "./pages/components/ProgressPage";
import HouseOnboardingPage from "./pages/HouseOnboardingPage";
import ReturningFeedPage from "./pages/feed/ReturningFeedPage";
import NewFeedPage from "./pages/feed/NewFeedPage";
import TaskDetailPage from "./pages/feed/TaskDetailPage";
import MyTaskPage from "./pages/feed/MyTaskPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/house/new" element={<HouseOnboardingPage />} />
          <Route path="/feed" element={<ReturningFeedPage />} />
          <Route path="/feed/new" element={<NewFeedPage />} />
          <Route
            path="/feed/task/:id"
            element={<TaskDetailPage variant="expanded" />}
          />
          <Route
            path="/feed/task/:id/full"
            element={<TaskDetailPage variant="full" />}
          />
          <Route path="/tasks/:id" element={<MyTaskPage />} />
          <Route path="/components/button" element={<ButtonPage />} />
          <Route path="/components/badge" element={<BadgePage />} />
          <Route path="/components/dialog" element={<DialogPage />} />
          <Route path="/components/tabs" element={<TabsPage />} />
          <Route path="/components/avatar" element={<AvatarPage />} />
          <Route path="/components/progress" element={<ProgressPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </TooltipProvider>
  </React.StrictMode>,
);
