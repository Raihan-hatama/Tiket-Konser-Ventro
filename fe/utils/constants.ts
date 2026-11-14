// Origin backend (tanpa "/api"), dipakai untuk membentuk URL file upload
// seperti poster event. Nilai diambil dari NEXT_PUBLIC_API_URL.
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
).replace(/\/api\/?$/, "");
