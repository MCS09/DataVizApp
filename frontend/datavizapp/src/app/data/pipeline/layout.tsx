"use client";

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
        <div className="ag-theme-alpine" style={{ height: "600px", width: "60%" }}>
            {children}
        </div>
        <div style={{ width: "40%", backgroundColor: "lightgray" }}>
        {/* Empty for now */}
        </div>
    </div>
  );
}
