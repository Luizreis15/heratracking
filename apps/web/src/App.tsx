import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewOperationPage } from "@/pages/NewOperationPage";
import { OperationLayout } from "@/pages/operation/OperationLayout";
import { BoardView } from "@/pages/operation/BoardView";
import { BlueprintView } from "@/pages/operation/BlueprintView";
import { ConcorrenciaView } from "@/pages/operation/ConcorrenciaView";
import { HeraDgView } from "@/pages/operation/HeraDgView";
import { OperacaoView } from "@/pages/operation/OperacaoView";
import { InteligenciaView } from "@/pages/operation/InteligenciaView";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/operations/new" element={<NewOperationPage />} />
          <Route path="/operations/:id" element={<OperationLayout />}>
            <Route index element={<BoardView />} />
            <Route path="blueprint" element={<BlueprintView />} />
            <Route path="concorrencia" element={<ConcorrenciaView />} />
            <Route path="hera-dg" element={<HeraDgView />} />
            <Route path="operacao" element={<OperacaoView />} />
            <Route path="inteligencia" element={<InteligenciaView />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
