import { createBrowserRouter, Navigate } from "react-router";
import { LandingPage }    from "./components/LandingPage";
import { LoginPage }      from "./components/LoginPage";
import { RegisterPage }   from "./components/RegisterPage";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { WargaDashboard } from "./components/dashboard/WargaDashboard";
import { NotFoundPage }   from "./components/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  // canonical login/register routes
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  // Indonesian aliases — same component, no redirect hop
  {
    path: "/masuk",
    Component: LoginPage,
  },
  {
    path: "/daftar",
    Component: RegisterPage,
  },
  // protected dashboards
  {
    path: "/dashboard",
    Component: DashboardLayout,
  },
  // alias so DashboardLayout internal navigate("/dashboard") always works
  {
    path: "/admin/dashboard",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/warga",
    Component: WargaDashboard,
  },
  {
    path: "/warga/dashboard",
    element: <Navigate to="/warga" replace />,
  },
  // explicit 404 route
  {
    path: "/404",
    Component: NotFoundPage,
  },
  // catch-all — show 404 page instead of silently redirecting home
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
