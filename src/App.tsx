import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import ScanQR from "./pages/ScanQR";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Classes from "./pages/Classes";
import Teachers from "./pages/Teachers";
import History from "./pages/History";
import Subscription from "./pages/Subscription";
import PublicMonitoring from "./pages/PublicMonitoring";
import PublicClassMonitoring from "./pages/PublicClassMonitoring";
import SchoolSettings from "./pages/SchoolSettings";
import AccountSettings from "./pages/AccountSettings";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminSchools from "./pages/super-admin/SuperAdminSchools";
import SuperAdminPlans from "./pages/super-admin/SuperAdminPlans";
import SuperAdminPayments from "./pages/super-admin/SuperAdminPayments";
import SuperAdminSubscriptions from "./pages/super-admin/SuperAdminSubscriptions";
import SuperAdminWhatsApp from "./pages/super-admin/SuperAdminWhatsApp";
import SuperAdminBranches from "./pages/super-admin/SuperAdminBranches";
import ExportHistory from "./pages/ExportHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/live/:schoolId" element={<PublicMonitoring />} />
            <Route path="/live/:schoolId/:className" element={<PublicClassMonitoring />} />
            {/* Super Admin */}
            <Route element={<SuperAdminLayout />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/schools" element={<SuperAdminSchools />} />
              <Route path="/super-admin/plans" element={<SuperAdminPlans />} />
              <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptions />} />
              <Route path="/super-admin/payments" element={<SuperAdminPayments />} />
              <Route path="/super-admin/whatsapp" element={<SuperAdminWhatsApp />} />
              <Route path="/super-admin/branches" element={<SuperAdminBranches />} />
            </Route>
            {/* School Admin / Staff */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/scan" element={<ScanQR />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/students" element={<Students />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/history" element={<History />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/school-settings" element={<SchoolSettings />} />
              <Route path="/account-settings" element={<AccountSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
