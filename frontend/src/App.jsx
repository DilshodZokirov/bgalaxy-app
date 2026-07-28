import { Navigate, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./hooks/useAuth";
import { BootstrapProvider } from "./hooks/useCompany";
import ThemeApplier from "./components/ThemeApplier";
import LockManager from "./components/LockManager";
import LockScreen from "./components/LockScreen";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Chat from "./pages/Chat";
import Meeting from "./pages/Meeting";
import InviteAccept from "./pages/InviteAccept";
import VirtualOffice from "./pages/VirtualOffice";
import Rafiq from "./pages/Rafiq";
import Accounting from "./pages/Accounting";
import GroupMeeting from "./pages/GroupMeeting";
import MeetingsHub from "./pages/MeetingsHub";
import PartnerCall from "./pages/PartnerCall";
import Tasks from "./pages/Tasks";
import VerifyEmail from "./pages/VerifyEmail";
import DeveloperPanel from "./pages/DeveloperPanel";
import Analytics from "./pages/Analytics";
import Warehouse from "./pages/Warehouse";
import Marketplace from "./pages/Marketplace";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ResetPin from "./pages/ResetPin";
import GalaxyDemo from "./pages/GalaxyDemo";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function LockGate() {
  const { locked } = useAuth();
  if (!locked) return null;
  return <LockScreen />;
}

export default function App() {
  const body = (
    <AuthProvider>
      <BootstrapProvider>
      <ThemeApplier />
      <LockManager />
      <LockGate />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/galaxy-demo" element={<GalaxyDemo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/reset-pin/:token" element={<ResetPin />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:companyId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:companyId/:channelId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting/:callId"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route
          path="/office"
          element={
            <ProtectedRoute>
              <VirtualOffice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rafiq"
          element={
            <ProtectedRoute>
              <Rafiq />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting"
          element={
            <ProtectedRoute>
              <Accounting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/group-meeting"
          element={
            <ProtectedRoute>
              <GroupMeeting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meetings"
          element={
            <ProtectedRoute>
              <MeetingsHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner-call/:roomName"
          element={
            <ProtectedRoute>
              <PartnerCall />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/developer"
          element={
            <ProtectedRoute>
              <DeveloperPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistika"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route path="/analytics" element={<Navigate to="/statistika" replace />} />
        <Route
          path="/warehouse"
          element={
            <ProtectedRoute>
              <Warehouse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/direct-chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/direct-chat/:conversationId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
      </BootstrapProvider>
    </AuthProvider>
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{body}</GoogleOAuthProvider>
  ) : (
    body
  );
}
