import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";

// /dashboard/batteries was the old admin battery list. Platform admins go to the admin page and
// everyone else to their own batteries; query params are kept.
export function BatteriesRedirect() {
  const { isAdmin } = useAuth();
  const { search } = useLocation();
  return <Navigate to={`${isAdmin ? "/dashboard/admin-batteries" : "/dashboard/my-batteries"}${search}`} replace />;
}

export default BatteriesRedirect;
