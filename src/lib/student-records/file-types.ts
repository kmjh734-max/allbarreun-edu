const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function isPdfUpload(file: { type: string; name: string }): boolean {
  const type = file.type.toLowerCase();
  if (type === "application/pdf" || type === "application/x-pdf") return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

export function isImageUpload(file: { type: string; name?: string }): boolean {
  if (IMAGE_TYPES.has(file.type.toLowerCase())) return true;
  const name = file.name?.toLowerCase() ?? "";
  return /\.(jpe?g|png|webp)$/.test(name);
}

export function resolveImageMimeType(file: {
  type: string;
  name: string;
}): string {
  const type = file.type.toLowerCase();
  if (IMAGE_TYPES.has(type)) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
