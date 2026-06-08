import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewOperationPage } from "@/pages/NewOperationPage";
import { OperationLayout } from "@/pages/operation/OperationLayout";
import { BoardView } from "@/pages/operation/BoardView";
import { BlueprintLayout } from "@/pages/operation/BlueprintView";
import { BlueprintSectionPage } from "@/pages/operation/BlueprintSectionPage";
import { ConcorrenciaView } from "@/pages/operation/ConcorrenciaView";
import { HeraDgView } from "@/pages/operation/HeraDgView";
import { OperacaoView } from "@/pages/operation/OperacaoView";
import { InteligenciaView } from "@/pages/operation/InteligenciaView";
import { ContentHubView } from "@/pages/operation/ContentHubView";

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
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
            <Route path="blueprint" element={<ErrorBoundary><BlueprintLayout /></ErrorBoundary>}>
              <Route path=":sectionKey" element={<BlueprintSectionPage />} />
            </Route>
            <Route path="concorrencia" element={<ErrorBoundary><ConcorrenciaView /></ErrorBoundary>} />
            <Route path="analise" element={<ErrorBoundary><HeraDgView /></ErrorBoundary>} />
            <Route path="hera-dg" element={<Navigate to="analise" replace />} />
            <Route path="operacao" element={<ErrorBoundary><OperacaoView /></ErrorBoundary>} />
            <Route path="inteligencia" element={<ErrorBoundary><InteligenciaView /></ErrorBoundary>} />
            <Route path="conteudo" element={<ErrorBoundary><ContentHubView /></ErrorBoundary>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}
