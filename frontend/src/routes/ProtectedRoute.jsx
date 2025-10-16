import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const location = useLocation();

  if (!user) {
    // Gửi về home nhưng kèm query để Navbar mở popup và biết redirect target
    const redirect = encodeURIComponent(location.pathname + (location.search || ""));
    return <Navigate to={`/?showLogin=1&redirect=${redirect}`} replace />;
  }
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
