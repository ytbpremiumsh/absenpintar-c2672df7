import { useEffect, useRef, useCallback } from "react";
import QRCodeStyling from "qr-code-styling";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  studentName?: string;
  studentClass?: string;
  schoolName?: string;
  schoolLogo?: string;
  autoFrame?: boolean;
}

const QRCodeDisplay = ({ data, size = 200, studentName, studentClass, schoolName, schoolLogo, autoFrame = true }: QRCodeDisplayProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      data,
      type: "svg",
      dotsOptions: {
        color: "hsl(234, 89%, 40%)",
        type: "rounded",
      },
      cornersSquareOptions: {
        color: "hsl(234, 89%, 30%)",
        type: "extra-rounded",
      },
      cornersDotOptions: {
        color: "hsl(260, 80%, 50%)",
        type: "dot",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 4,
      },
    });

    if (ref.current) {
      ref.current.innerHTML = "";
      qrCode.current.append(ref.current);
    }
  }, [data, size]);

  const downloadWithFrame = useCallback(async () => {
    if (!qrCode.current) return;

    const qrRaw = await qrCode.current.getRawData("png");
    if (!qrRaw) return;

    const qrBlob = qrRaw instanceof Blob ? qrRaw : new Blob([new Uint8Array(qrRaw as any)]);
    const qrImg = new Image();
    const qrUrl = URL.createObjectURL(qrBlob);

    qrImg.onload = () => {
      const padding = 40;
      const headerHeight = schoolName || studentName ? 70 : 0;
      const footerHeight = 40;
      const cardWidth = size + padding * 2;
      const cardHeight = size + padding * 2 + headerHeight + footerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(0, 0, cardWidth, cardHeight, 16);
      ctx.fill();

      // Top color band
      const grad = ctx.createLinearGradient(0, 0, cardWidth, 0);
      grad.addColorStop(0, "hsl(234, 89%, 40%)");
      grad.addColorStop(1, "hsl(260, 80%, 50%)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(0, 0, cardWidth, headerHeight || 12, [16, 16, 0, 0]);
      ctx.fill();

      // Header text
      if (headerHeight > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        if (schoolName) {
          ctx.font = "bold 13px system-ui, sans-serif";
          ctx.fillText(schoolName, cardWidth / 2, 24, cardWidth - 20);
        }
        if (studentName) {
          ctx.font = "bold 16px system-ui, sans-serif";
          ctx.fillText(studentName, cardWidth / 2, 46, cardWidth - 20);
        }
        if (studentClass) {
          ctx.font = "12px system-ui, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(`Kelas ${studentClass}`, cardWidth / 2, 62, cardWidth - 20);
        }
      }

      // QR Code
      const qrX = (cardWidth - size) / 2;
      const qrY = headerHeight + padding / 2;
      ctx.drawImage(qrImg, qrX, qrY, size, size);

      // Border around QR
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX - 4, qrY - 4, size + 8, size + 8);

      // Footer
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "center";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("Smart School Pickup System", cardWidth / 2, cardHeight - 14);

      // Download
      const link = document.createElement("a");
      link.download = `QR-${studentName || data}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(qrUrl);
    };
    qrImg.src = qrUrl;
  }, [data, size, studentName, studentClass, schoolName]);

  const handleSimpleDownload = () => {
    qrCode.current?.download({
      name: `qr-${studentName || data}`,
      extension: "png",
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={ref} className="rounded-xl overflow-hidden border border-border p-2 bg-white" />
      <div className="flex gap-2">
        {autoFrame && (studentName || schoolName) ? (
          <Button variant="outline" size="sm" onClick={downloadWithFrame} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Download dengan Frame
          </Button>
        ) : (
          <button onClick={handleSimpleDownload} className="text-xs text-primary hover:underline font-medium">
            Download QR
          </button>
        )}
      </div>
    </div>
  );
};

export default QRCodeDisplay;
