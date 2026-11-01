import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard, Auth } from "@/layouts";
import { Enterprise } from "@/layouts/enterprise";
import { PlatformAdmin } from "@/layouts/platform-admin";
import { LandingPage } from "@/pages/landing-page";
import { PublicFaq } from "@/pages/faq";
import { Privacidad } from "@/pages/privacidad";
import { Terminos } from "@/pages/terminos";
import RequireAuth from "@/components/RequireAuth";
import RateLimitNotice from "@/components/RateLimitNotice";
import { ForgotPassword, ResetPassword, EmailVerification } from "@/pages/auth";
import { AccessAction } from "@/pages/dashboard";
import { PublicVerification } from "@/enterprise/pages/certifications/PublicVerification";
import { NoCompany } from "@/enterprise/pages/NoCompany";
import { JoinPage } from "@/pages/join/JoinPage";
import { WaitingPage } from "@/pages/waiting/WaitingPage";

function App() {
  return (
    <>
    <RateLimitNotice />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/faq" element={<PublicFaq />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/waiting" element={<RequireAuth><WaitingPage /></RequireAuth>} />
      <Route path="/dashboard/*" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/enterprise/*" element={<RequireAuth><Enterprise /></RequireAuth>} />
      <Route path="/platform-admin/*" element={<RequireAuth><PlatformAdmin /></RequireAuth>} />
      <Route path="/sin-empresa" element={<RequireAuth><NoCompany /></RequireAuth>} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/access/:action" element={<RequireAuth><AccessAction /></RequireAuth>} />
      <Route path="/verify/:identifier" element={<PublicVerification />} />
      <Route path="/verify" element={<PublicVerification />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
