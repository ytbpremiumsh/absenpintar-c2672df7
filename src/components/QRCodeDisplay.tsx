import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  studentName?: string;
}

const QRCodeDisplay = ({ data, size = 200, studentName }: QRCodeDisplayProps) => {
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

  const handleDownload = () => {
    qrCode.current?.download({
      name: `qr-${studentName || data}`,
      extension: "png",
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="rounded-xl overflow-hidden border border-border p-2 bg-white" />
      <button
        onClick={handleDownload}
        className="text-xs text-primary hover:underline font-medium"
      >
        Download QR
      </button>
    </div>
  );
};

export default QRCodeDisplay;
