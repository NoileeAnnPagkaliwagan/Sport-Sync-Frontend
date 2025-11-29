// ExportButton.jsx
import React, { useState, useRef } from "react";
import { Download, FileText, File } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import domtoimage from "dom-to-image-more";

export default function ExportButton({
  className = "",
  data = [],
  columns = [],
  fileName = "Report",
  title = "Data Report",
  domElementRef = null,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // helpers
  const blobToDataURL = (blob) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });

  // inline remote images and replace canvases inside a cloned node
  async function prepareClonedNode(originalNode) {
    const clone = originalNode.cloneNode(true);

    // inline images: try fetch -> blob -> dataURL, else hide image
    const imgs = Array.from(clone.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        try {
          // skip blank or data urls
          if (!img.src) return;
          if (img.src.startsWith("data:")) return;

          // try fetch with CORS
          const resp = await fetch(img.src, { mode: "cors", credentials: "omit" });
          if (!resp.ok) throw new Error("image fetch failed");
          const blob = await resp.blob();
          const dataUrl = await blobToDataURL(blob);
          img.setAttribute("data-orig-src", img.src);
          img.src = dataUrl;
          // ensure no crossOrigin attribute breaks dom-to-image
          img.removeAttribute("crossorigin");
        } catch (err) {
          // If we can't inline, hide the image so dom-to-image won't attempt to load it and throw
          console.warn("Could not inline image, hiding it:", img.src, err);
          img.style.display = "none";
        }
      })
    );

    // convert canvases to images (so dom-to-image doesn't need to re-render canvas)
    const canvases = Array.from(clone.querySelectorAll("canvas"));
    canvases.forEach((canvas) => {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const imgEl = document.createElement("img");
        imgEl.src = dataUrl;
        imgEl.width = canvas.width;
        imgEl.height = canvas.height;
        // copy some inline styles so layout remains similar
        imgEl.style.cssText = canvas.style.cssText;
        canvas.parentNode.replaceChild(imgEl, canvas);
      } catch (err) {
        console.warn("Could not convert canvas to image, hiding canvas:", err);
        canvas.style.display = "none";
      }
    });

    // remove any interactive/export buttons inside clone to avoid capturing them
    const noPrintElems = clone.querySelectorAll(".no-print");
    noPrintElems.forEach((el) => (el.style.display = "none"));

    return clone;
  }

  // --- CSV Export Logic ---
  const exportToCSV = () => {
    if (!data || !data.length) {
      alert("No data to export");
      return;
    }
    try {
      const headers = columns.map((col) => col.header).join(",");
      const rows = data
        .map((row) =>
          columns
            .map((col) => {
              let val = row[col.accessor];
              if (typeof val === "string") {
                val = val.replace(/"/g, '""');
                if (val.includes(",")) val = `"${val}"`;
              }
              if (React.isValidElement(val)) return val.props.children;
              return val ?? "";
            })
            .join(",")
        )
        .join("\n");

      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("CSV Error:", error);
      alert("CSV Export failed.");
    }
  };

  // --- PDF Export Logic ---
  const exportToPDF = async () => {
    if (!data || !data.length) {
      alert("No data to export");
      return;
    }

    if (!domElementRef || !domElementRef.current) {
      // still export table only if no DOM chart
      await exportTableOnlyPDF();
      return;
    }

    document.body.style.cursor = "wait";

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = 20;

      // Title + date
      doc.setFontSize(18);
      doc.text(title, 14, currentY);
      currentY += 8;
      doc.setFontSize(11);
      doc.setTextColor(100);
      const dateStr = new Date().toLocaleDateString("en-US");
      doc.text(`Generated on: ${dateStr}`, 14, currentY);
      currentY += 15;

      // Capture charts (preprocess clone)
      try {
        // wait a short moment for charts to finish rendering
        await new Promise((r) => setTimeout(r, 250));

        const cloned = await prepareClonedNode(domElementRef.current);

        const imgData = await domtoimage.toPng(cloned, {
          bgcolor: "#ffffff",
          cacheBust: true,
          useCORS: true,
          imagePlaceholder: "",
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
          filter: (node) => {
            // hide elements we explicitly want to exclude
            return !node.classList?.contains("no-print");
          },
        });

        const imgProps = doc.getImageProperties(imgData);
        const margin = 14;
        const pdfImageWidth = pageWidth - margin * 2;
        const pdfImageHeight = (imgProps.height * pdfImageWidth) / imgProps.width;

        if (currentY + pdfImageHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }

        doc.addImage(imgData, "PNG", margin, currentY, pdfImageWidth, pdfImageHeight);
        currentY += pdfImageHeight + 10;
      } catch (imgError) {
        console.warn("Chart capture failed (Table only):", imgError);
        // proceed to produce table only PDF
      }

      // 3. Add Table
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Detailed Data", 14, currentY);
      currentY += 5;

      const tableColumn = columns.map((col) => col.header);
      const tableRows = data.map((row) => {
        return columns.map((col) => {
          const val = row[col.accessor];
          if (React.isValidElement(val)) {
            return val.props.children || "";
          }
          return val;
        });
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [0, 43, 80] },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Failed to export PDF.");
    } finally {
      document.body.style.cursor = "default";
    }
  };

  // fallback: export PDF with table only if dom node missing
  const exportTableOnlyPDF = async () => {
    document.body.style.cursor = "wait";
    try {
      const doc = new jsPDF("p", "mm", "a4");
      let currentY = 20;
      doc.setFontSize(18);
      doc.text(title, 14, currentY);
      currentY += 12;
      const tableColumn = columns.map((col) => col.header);
      const tableRows = data.map((row) =>
        columns.map((col) => {
          const val = row[col.accessor];
          if (React.isValidElement(val)) return val.props.children || "";
          return val;
        })
      );
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [0, 43, 80] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      doc.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("Table-only PDF error", err);
      alert("Failed to export PDF.");
    } finally {
      document.body.style.cursor = "default";
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className} no-print`}
      onBlur={(e) => {
        if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f781a] text-white border border-transparent shadow-sm rounded-lg hover:bg-[#166534] transition-colors cursor-pointer font-medium text-sm"
      >
        <Download size={16} />
        <span>Export</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50">
          <div className="py-1">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                exportToPDF();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors group text-left"
            >
              <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">Export as PDF</div>
                <div className="text-xs text-slate-500">Charts & Table</div>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1"></div>

            <button
              onMouseDown={(e) => {
                e.preventDefault();
                exportToCSV();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors group text-left"
            >
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                <File size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">Export as CSV</div>
                <div className="text-xs text-slate-500">Table Data Only</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
