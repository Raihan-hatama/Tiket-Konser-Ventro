"use client";

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <div className="flex justify-center gap-2 mt-8">
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          onClick={() => onPageChange(index + 1)}
          className={`px-4 py-2 rounded-lg ${
            currentPage === index + 1
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}