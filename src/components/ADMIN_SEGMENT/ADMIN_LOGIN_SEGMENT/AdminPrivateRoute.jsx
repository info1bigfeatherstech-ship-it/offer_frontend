import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetAdminMeQuery } from "../ADMIN_REDUX_MANAGEMENT/adminAuthApi";
import { selectAdminStatus, selectAdminUser } from "../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { ROLES } from "../roles";
import { ADMIN_ACCESS_TOKEN_KEY } from "../../../SERVICES/axiosInstance";

const VALID_ADMIN_ROLES = Object.values(ROLES);

const decodeToken = (token) => {
    try {
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload;
    } catch { return null; }
};

const AdminLoadingScreen = () => (
    <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "#000", gap: "16px"
    }}>
        <div style={{
            width: "40px", height: "40px", border: "3px solid #1f1f1f",
            borderTop: "3px solid #f7a221", borderRadius: "50%",
            animation: "adminSpin 0.8s linear infinite"
        }} />
        <p style={{
            color: "#555", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.2em", textTransform: "uppercase", margin: 0
        }}>
            Verifying access…
        </p>
        <style>{`@keyframes adminSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

const AdminPrivateRoute = ({ children }) => {
    const location = useLocation();
    const status   = useSelector(selectAdminStatus);
    const user     = useSelector(selectAdminUser);

    const token   = localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
    const payload = decodeToken(token);

    // ── Fire /auth/me ONLY when:
    //    - token exists in localStorage
    //    - AND status is still idle (token existed but couldn't decode on startup)
    //    - NOT when already authenticated or unauthenticated (final states)
    //    - NOT when no token (nothing to verify)
    const skip = !token || status === "authenticated" || status === "unauthenticated";
    const { isFetching } = useGetAdminMeQuery(undefined, { skip });

    // ── 1. No token → login immediately, no spinner ───────────────────────
    if (!token) {
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }

    // ── 2. Token exists but we're still verifying (idle/loading/fetching) ─
    // Show spinner — axiosInstance will silently refresh if needed
    if (isFetching || status === "idle" || status === "loading") {
        return <AdminLoadingScreen />;
    }

    // ── 3. Server confirmed unauthenticated → login ───────────────────────
    if (status === "unauthenticated" || !user) {
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }

    // ── 4. Authenticated — now check role from server-confirmed user ──────
    if (user.role === "user") {
        return <Navigate to="/no-access" replace />;
    }

    if (!VALID_ADMIN_ROLES.includes(user.role)) {
        return <Navigate to="/admin/unauthorized" replace />;
    }

    // ── 5. All checks passed ──────────────────────────────────────────────
    return children;
};

export default AdminPrivateRoute;
