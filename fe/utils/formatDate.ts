export default function formatDate(date: string): string {
  if (!date) return "-";

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}