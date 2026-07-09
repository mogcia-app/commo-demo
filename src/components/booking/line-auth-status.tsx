"use client";

export function LineAuthStatus({ verified, state }: { verified: boolean; state: string }) {
  return (
    <div className="mb-3 flex justify-end">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
          verified ? "bg-[#E8F7EF] text-[#147A3F]" : "bg-white/80 text-[#6F6257]"
        }`}
      >
        {verified ? "LINE認証済み" : state}
      </span>
    </div>
  );
}
