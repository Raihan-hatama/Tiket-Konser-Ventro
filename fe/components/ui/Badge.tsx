"use client";

interface Props {
  status: string;
}

export default function Badge({ status }: Props) {
  let color = "";

  switch (status) {
    case "open":
      color = "bg-green-100 text-green-700";
      break;

    case "closed":
      color = "bg-red-100 text-red-700";
      break;

    default:
      color = "bg-gray-100 text-gray-700";
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm ${color}`}>
      {status}
    </span>
  );
}