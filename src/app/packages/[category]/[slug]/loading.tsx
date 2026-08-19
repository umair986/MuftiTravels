export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]"></div>
        <p className="mt-4 font-display text-2xl font-bold text-[#06131D]">Preparing your journey</p>
      </div>
    </div>
  );
}
