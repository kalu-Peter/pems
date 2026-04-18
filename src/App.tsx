import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import SubmitResultsPage from "./pages/SubmitResultsPage";
import ResultsPage from "./pages/ResultsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse font-heading text-muted-foreground">Loading...</div>
  </div>
);

/** Redirects to the correct dashboard based on role */
const RoleRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (profile.role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (profile.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/agent" replace />;
};

/** Login page: redirect to /dashboard if already logged in */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

/** Any authenticated user */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

/** Only the specified role(s) */
const RoleRoute: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public home — live results, visible to everyone */}
            <Route path="/" element={<HomePage />} />

            {/* Login */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

            {/* Dashboard entry point — redirects based on role */}
            <Route path="/dashboard" element={<RoleRedirect />} />

            {/* Super Admin */}
            <Route
              path="/super-admin"
              element={<RoleRoute roles={["super_admin"]}><SuperAdminDashboard /></RoleRoute>}
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={<RoleRoute roles={["admin"]}><AdminDashboard /></RoleRoute>}
            />

            {/* Agent */}
            <Route
              path="/agent"
              element={<RoleRoute roles={["agent"]}><Dashboard /></RoleRoute>}
            />
            <Route
              path="/submit"
              element={<RoleRoute roles={["agent"]}><SubmitResultsPage /></RoleRoute>}
            />

            {/* Results — accessible to all authenticated users */}
            <Route
              path="/results"
              element={<ProtectedRoute><ResultsPage /></ProtectedRoute>}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
