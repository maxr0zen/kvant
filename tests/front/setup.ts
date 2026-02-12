import "@testing-library/jest-dom";

// So that hasApi() is true in API tests (client reads at load time)
if (typeof process !== "undefined" && process.env) {
  process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://test-api";
}
