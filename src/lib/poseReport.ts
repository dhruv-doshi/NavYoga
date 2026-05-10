import type { Landmark, PoseComparisonResult } from "./types";
import { drawSkeletonInRect, type JointColorMap } from "./drawing";
import { comparisonToJointColors } from "./poseComparison";

export interface ReportAnnotation {
  joint: string;
  label: string;
  message: string;
  status: "correct" | "incorrect";
}

function formatJointLabel(joint: string): string {
  return joint
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function buildAnnotations(result: PoseComparisonResult): ReportAnnotation[] {
  return result.joints
    .filter((j) => j.status !== "unknown")
    .map((j) => ({
      joint: j.joint,
      label: formatJointLabel(j.joint),
      message: j.status === "correct" ? "aligned" : (j.correctionText ?? "needs adjustment"),
      status: j.status === "correct" ? "correct" : "incorrect",
    }));
}

async function loadImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url.slice(0, 60)}`));
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface GenerateReportOptions {
  masterImageUrl: string;
  studentImageUrl: string;
  poseName: string;
  sanskrit: string;
  result: PoseComparisonResult;
  score: number;
  masterLandmarks?: Landmark[];
  studentLandmarks?: Landmark[];
}

export async function generatePoseReportBlob(opts: GenerateReportOptions): Promise<Blob> {
  const { masterImageUrl, studentImageUrl, poseName, sanskrit, result, score, masterLandmarks, studentLandmarks } = opts;

  const W = 1400;
  const H = 820;
  const HEADER_H = 72;
  const FOOTER_H = 50;
  const LABEL_H = 28;
  const PHOTO_Y = HEADER_H + LABEL_H;
  const PHOTO_H = H - HEADER_H - LABEL_H - FOOTER_H - 10;
  const HALF_W = W / 2;
  const PAD = 10;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Parchment background
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, W, H);

  // Header background bar
  ctx.fillStyle = "#e8e0d0";
  ctx.fillRect(0, 0, W, HEADER_H);

  // Header title
  const titleParts = sanskrit
    ? `YOGA POSE AUDIT REPORT — ${poseName.toUpperCase()} (${sanskrit.toUpperCase()})`
    : `YOGA POSE AUDIT REPORT — ${poseName.toUpperCase()}`;
  ctx.fillStyle = "#2d2416";
  ctx.font = "bold 20px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(titleParts, W / 2, HEADER_H / 2, W - 40);

  // Left side label — Expert
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillStyle = "#2d7a2d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EXPERT FORM  ✓", HALF_W / 2, HEADER_H + LABEL_H / 2);

  // Right side label — Your Form
  ctx.fillStyle = "#c07020";
  ctx.fillText("YOUR FORM  ⚠", HALF_W + HALF_W / 2, HEADER_H + LABEL_H / 2);

  // Load and draw images
  const drawPlaceholder = (x: number) => {
    ctx.fillStyle = "#e0d8c8";
    ctx.fillRect(x + PAD, PHOTO_Y, HALF_W - PAD * 2, PHOTO_H);
    ctx.fillStyle = "#b0a898";
    ctx.font = "14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Image unavailable", x + HALF_W / 2, PHOTO_Y + PHOTO_H / 2);
  };

  const coverFit = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): { x: number; y: number; w: number; h: number } => {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    const dx = x + (w - sw) / 2;
    const dy = y + (h - sh) / 2;
    ctx.drawImage(img, dx, dy, sw, sh);
    return { x: dx, y: dy, w: sw, h: sh };
  };

  let masterDrawRect: { x: number; y: number; w: number; h: number } | null = null;
  let studentDrawRect: { x: number; y: number; w: number; h: number } | null = null;

  // Draw master (left) — native orientation, no mirror
  try {
    const masterImg = await loadImageEl(masterImageUrl);
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD, PHOTO_Y, HALF_W - PAD * 2, PHOTO_H);
    ctx.clip();
    masterDrawRect = coverFit(masterImg, PAD, PHOTO_Y, HALF_W - PAD * 2, PHOTO_H);
    ctx.restore();
  } catch {
    drawPlaceholder(0);
  }

  // Draw student (right)
  try {
    const studentImg = await loadImageEl(studentImageUrl);
    ctx.save();
    ctx.beginPath();
    ctx.rect(HALF_W + PAD, PHOTO_Y, HALF_W - PAD * 2, PHOTO_H);
    ctx.clip();
    studentDrawRect = coverFit(studentImg, HALF_W + PAD, PHOTO_Y, HALF_W - PAD * 2, PHOTO_H);
    ctx.restore();
  } catch {
    drawPlaceholder(HALF_W);
  }

  // Overlay master skeleton (expert green)
  if (masterLandmarks && masterLandmarks.length > 0 && masterDrawRect) {
    drawSkeletonInRect(ctx, masterLandmarks, masterDrawRect, { tone: "expert", opacity: 0.9 });
  }

  // Overlay student skeleton with per-joint error highlighting
  if (studentLandmarks && studentLandmarks.length > 0 && studentDrawRect) {
    const jointColors: JointColorMap = comparisonToJointColors(result);
    drawSkeletonInRect(ctx, studentLandmarks, studentDrawRect, {
      tone: "student",
      jointColors,
      highlightErrors: true,
      opacity: 0.9,
    });
  }

  // Center divider
  ctx.strokeStyle = "#8b7355";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(HALF_W, HEADER_H);
  ctx.lineTo(HALF_W, H - FOOTER_H);
  ctx.stroke();

  // Annotations overlay on right side (bottom area)
  const annotations = buildAnnotations(result);
  const annotStartY = PHOTO_Y + PHOTO_H - Math.min(annotations.length, 6) * 22 - 8;
  const annotW = HALF_W - PAD * 3;

  ctx.fillStyle = "rgba(245, 240, 232, 0.92)";
  ctx.fillRect(HALF_W + PAD, annotStartY - 6, annotW, Math.min(annotations.length, 6) * 22 + 12);

  ctx.font = "12px Arial, sans-serif";
  ctx.textBaseline = "top";
  let annotY = annotStartY;
  for (const ann of annotations.slice(0, 6)) {
    ctx.fillStyle = ann.status === "correct" ? "#2d7a2d" : "#c04030";
    ctx.textAlign = "left";
    const prefix = ann.status === "correct" ? "✓ " : "⚠ ";
    const text = `${prefix}${ann.label}: ${ann.message}`;
    const lines = wrapText(ctx, text, annotW - 8);
    ctx.fillText(lines[0], HALF_W + PAD + 4, annotY, annotW - 8);
    annotY += 22;
  }

  // Footer
  const footerY = H - FOOTER_H;
  ctx.fillStyle = "#c8b89a";
  ctx.fillRect(0, footerY, W, FOOTER_H);

  ctx.font = "13px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#5a4a2a";

  // Score badge left
  ctx.textAlign = "left";
  const scoreColor = score >= 80 ? "#2d7a2d" : score >= 60 ? "#c07020" : "#c04030";
  ctx.fillStyle = scoreColor;
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText(`Overall Score: ${score}%`, 20, footerY + FOOTER_H / 2);

  // Legend center
  ctx.fillStyle = "#5a4a2a";
  ctx.font = "11px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✓ aligned   ⚠ needs adjustment", W / 2, footerY + FOOTER_H / 2);

  // Date right
  ctx.textAlign = "right";
  ctx.fillText(`Generated ${new Date().toLocaleDateString()}`, W - 20, footerY + FOOTER_H / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/png",
      1.0
    );
  });
}
