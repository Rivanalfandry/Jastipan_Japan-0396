import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

/** Render node invoice ke PDF A4 (multi-halaman bila perlu) lalu download. */
export async function downloadInvoicePdf(node: HTMLElement, filename: string) {
  const dataUrl = await toJpeg(node, {
    quality: 0.9,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (img.height * pageW) / img.width;

  let offset = 0;
  pdf.addImage(dataUrl, "JPEG", 0, 0, pageW, imgH);
  offset += pageH;
  while (offset < imgH - 1) {
    pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", 0, -offset, pageW, imgH);
    offset += pageH;
  }
  pdf.save(filename);
}
