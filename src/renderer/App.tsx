import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import SetupWizard from "./pages/SetupWizard";
import ChatWindow from "./pages/ChatWindow";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/chat" element={<ChatWindow />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    </HashRouter>
  );
}
