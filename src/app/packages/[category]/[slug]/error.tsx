"use client";

export default function Error() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#092638] mb-4">
          Something went wrong!
        </h1>
        <p className="text-gray-600">
          Please try refreshing the page or go back to the packages list.
        </p>
      </div>
    </div>
  );
}
