"use client";

export default function CallButton({ phone }: { phone: string }) {
  return (
    <button
      onClick={() => (window.location.href = `tel:${phone}`)}
      style={{
        marginTop: 20,
        padding: "10px 20px",
        fontSize: 16,
        cursor: "pointer",
      }}
    >
      📞 Zadzwoń
    </button>
  );
}
