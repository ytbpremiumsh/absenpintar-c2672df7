import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
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
import ManageWaliKelas from "./pages/ManageWaliKelas";
import ManageStaff from "./pages/ManageStaff";
import WaliKelasDashboard from "./pages/WaliKelasDashboard";
import History from "./pages/History";
import Subscription from "./pages/Subscription";
import PublicMonitoring from "./pages/PublicMonitoring";
import PublicClassMonitoring from "./pages/PublicClassMonitoring";
import PublicAttendanceMonitoring from "./pages/PublicAttendanceMonitoring";
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
import SupportTickets from "./pages/SupportTickets";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import SuperAdminAnnouncements from "./pages/super-admin/SuperAdminAnnouncements";
import SuperAdminTickets from "./pages/super-admin/SuperAdminTickets";
import SuperAdminLanding from "./pages/super-admin/SuperAdminLanding";
import SuperAdminRegistrationWA from "./pages/super-admin/SuperAdminRegistrationWA";
import SuperAdminPresentation from "./pages/super-admin/SuperAdminPresentation";
import SuperAdminBusinessModel from "./pages/super-admin/SuperAdminBusinessModel";
import SuperAdminTestimonials from "./pages/super-admin/SuperAdminTestimonials";
import SuperAdminLoginLogs from "./pages/super-admin/SuperAdminLoginLogs";
import SuperAdminReferral from "./pages/super-admin/SuperAdminReferral";
import LandingPage from "./pages/LandingPage";
import Presentation from "./pages/Presentation";
import BusinessModel from "./pages/BusinessModel";
import ReferralDashboard from "./pages/ReferralDashboard";
import NotFound from "./pages/NotFound";
import Penawaran from "./pages/Penawaran";
import SuperAdminPenawaran from "./pages/super-admin/SuperAdminPenawaran";
import ForgotPassword from "./pages/ForgotPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DynamicFavicon />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/live/:schoolId" element={<PublicMonitoring />} />
            <Route path="/live/:schoolId/:className" element={<PublicClassMonitoring />} />
            <Route path="/attendance/:schoolId" element={<PublicAttendanceMonitoring />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/business-model" element={<BusinessModel />} />
            <Route path="/penawaran" element={<Penawaran />} />
            {/* Super Admin */}
            <Route element={<SuperAdminLayout />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/schools" element={<SuperAdminSchools />} />
              <Route path="/super-admin/plans" element={<SuperAdminPlans />} />
              <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptions />} />
              <Route path="/super-admin/payments" element={<SuperAdminPayments />} />
              <Route path="/super-admin/whatsapp" element={<SuperAdminWhatsApp />} />
              <Route path="/super-admin/branches" element={<SuperAdminBranches />} />
              <Route path="/super-admin/announcements" element={<SuperAdminAnnouncements />} />
              <Route path="/super-admin/tickets" element={<SuperAdminTickets />} />
              <Route path="/super-admin/landing" element={<SuperAdminLanding />} />
              <Route path="/super-admin/registration-wa" element={<SuperAdminRegistrationWA />} />
              <Route path="/super-admin/presentation" element={<SuperAdminPresentation />} />
              <Route path="/super-admin/business-model" element={<SuperAdminBusinessModel />} />
              <Route path="/super-admin/testimonials" element={<SuperAdminTestimonials />} />
              <Route path="/super-admin/login-logs" element={<SuperAdminLoginLogs />} />
              <Route path="/super-admin/referral" element={<SuperAdminReferral />} />
              <Route path="/super-admin/penawaran" element={<SuperAdminPenawaran />} />
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
              <Route path="/wali-kelas" element={<ManageWaliKelas />} />
              <Route path="/staff" element={<ManageStaff />} />
              <Route path="/wali-kelas-dashboard" element={<WaliKelasDashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/export-history" element={<ExportHistory />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/school-settings" element={<SchoolSettings />} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="/support" element={<SupportTickets />} />
              <Route path="/referral" element={<ReferralDashboard />} />
              <Route path="/whatsapp" element={<WhatsAppSettings />} />
              <Route path="/wa-templates" element={<Navigate to="/whatsapp" replace />} />
              <Route path="/wa-broadcast" element={<Navigate to="/whatsapp" replace />} />
              <Route path="/wa-history" element={<Navigate to="/whatsapp" replace />} />
              <Route path="/whatsapp-settings" element={<Navigate to="/whatsapp" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
