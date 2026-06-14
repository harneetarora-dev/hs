import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and PDF files allowed" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${uuidv4()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}`, filename: file.name });
}
