import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewOperationPage } from "@/pages/NewOperationPage";
import { OperationPage } from "@/pages/OperationPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/new"
          element={
            <ProtectedRoute>
              <NewOperationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/:id"
          element={
            <ProtectedRoute>
              <OperationPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
