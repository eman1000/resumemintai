import React from "react";

const FullscreenLoader: React.FC<{ label?: string }> = ({ label = "Working…" }) => (
  <div className="fixed inset-0 z-[9999] grid place-items-center bg-white/70 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent animate-spin" />
      <div className="text-sm text-gray-700">{label}</div>
    </div>
  </div>
);

export default FullscreenLoader;