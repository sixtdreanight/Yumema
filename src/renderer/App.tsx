import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import SetupWizard from "./pages/SetupWizard";
import ChatWindow from "./pages/ChatWindow";
import ErrorBoundary from "./components/shared/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/chat" element={<ChatWindow />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
