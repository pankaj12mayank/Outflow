"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 p-8 text-white">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-gray-400 text-sm text-center max-w-md">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium"
      >
        Try again
      </button>
      <a href="/landing" className="text-purple-400 text-sm hover:underline">
        Go to home
      </a>
    </div>
  );
}
