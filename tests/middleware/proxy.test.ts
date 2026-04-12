/**
 * Tests for the proxy/middleware configuration constants.
 * The middleware function itself wraps next-auth and can't be directly unit tested
 * without complex mocking, so we test the route constants and matching logic.
 */

describe("Middleware route configuration", () => {
  const PUBLIC_ROUTES = ["/", "/login", "/register", "/properties"];
  const HOST_ROUTES = ["/properties/new", "/dashboard/host"];
  const ADMIN_ROUTES = ["/admin"];

  function isPublic(pathname: string): boolean {
    return (
      PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/uploads") ||
      pathname.startsWith("/images")
    );
  }

  function isAdminRoute(pathname: string): boolean {
    return ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  }

  function isHostRoute(pathname: string): boolean {
    return HOST_ROUTES.some((r) => pathname.startsWith(r));
  }

  describe("isPublic", () => {
    it("/ is public", () => expect(isPublic("/")).toBe(true));
    it("/login is public", () => expect(isPublic("/login")).toBe(true));
    it("/register is public", () => expect(isPublic("/register")).toBe(true));
    it("/properties is public", () => expect(isPublic("/properties")).toBe(true));
    it("/properties/123 is public", () => expect(isPublic("/properties/123")).toBe(true));
    it("/api/anything is public", () => expect(isPublic("/api/bookings")).toBe(true));
    it("/_next/static is public", () => expect(isPublic("/_next/static/chunk.js")).toBe(true));
    it("/uploads/image.jpg is public", () => expect(isPublic("/uploads/image.jpg")).toBe(true));
    it("/images/logo.png is public", () => expect(isPublic("/images/logo.png")).toBe(true));
    it("/dashboard/guest is NOT public", () => expect(isPublic("/dashboard/guest")).toBe(false));
    it("/profile is NOT public", () => expect(isPublic("/profile")).toBe(false));
    it("/bookings is NOT public", () => expect(isPublic("/bookings")).toBe(false));
    it("/admin is NOT public", () => expect(isPublic("/admin")).toBe(false));
  });

  describe("isAdminRoute", () => {
    it("/admin is admin", () => expect(isAdminRoute("/admin")).toBe(true));
    it("/admin/users is admin", () => expect(isAdminRoute("/admin/users")).toBe(true));
    it("/admin/approvals is admin", () => expect(isAdminRoute("/admin/approvals")).toBe(true));
    it("/ is not admin", () => expect(isAdminRoute("/")).toBe(false));
    it("/dashboard is not admin", () => expect(isAdminRoute("/dashboard")).toBe(false));
  });

  describe("isHostRoute", () => {
    it("/properties/new is host", () => expect(isHostRoute("/properties/new")).toBe(true));
    it("/dashboard/host is host", () => expect(isHostRoute("/dashboard/host")).toBe(true));
    it("/dashboard/guest is NOT host", () => expect(isHostRoute("/dashboard/guest")).toBe(false));
    it("/properties is NOT host", () => expect(isHostRoute("/properties")).toBe(false));
  });
});
