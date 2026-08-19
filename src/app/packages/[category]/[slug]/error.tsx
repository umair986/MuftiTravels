"use client";

export default function Error() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-[#06131D] mb-3">
          We could not open this package
        </h1>
        <p className="text-stone-600">
          Please refresh the page or return to the available packages.
        </p>
      </div>
    </div>
  );
}
