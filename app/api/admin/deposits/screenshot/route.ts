import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

export async function GET(request: Request) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const file =
      searchParams.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "File is required.",
        },
        { status: 400 }
      );
    }

    const safeFileName =
      path.basename(file);

    if (safeFileName !== file) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file name.",
        },
        { status: 400 }
      );
    }

    const extension =
      path.extname(
        safeFileName
      ).toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.has(
        extension
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type.",
        },
        { status: 400 }
      );
    }

    // =========================
    // PRIVATE STORAGE
    // =========================

    const privateDirectory =
      path.resolve(
        process.cwd(),
        "private",
        "uploads",
        "deposits"
      );

    const privateFilePath =
      path.resolve(
        privateDirectory,
        safeFileName
      );

    const privateAllowedDirectory =
      privateDirectory + path.sep;

    // =========================
    // OLD PUBLIC STORAGE
    // =========================

    const publicDirectory =
      path.resolve(
        process.cwd(),
        "public",
        "uploads",
        "deposits"
      );

    const publicFilePath =
      path.resolve(
        publicDirectory,
        safeFileName
      );

    const publicAllowedDirectory =
      publicDirectory + path.sep;

    // =========================
    // PATH SECURITY
    // =========================

    if (
      !privateFilePath.startsWith(
        privateAllowedDirectory
      ) ||
      !publicFilePath.startsWith(
        publicAllowedDirectory
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file path.",
        },
        { status: 400 }
      );
    }

    // =========================
    // TRY PRIVATE FIRST
    // =========================

    let fileBuffer: Buffer;

    try {
      fileBuffer =
        await readFile(
          privateFilePath
        );
    } catch {
      // =========================
      // FALLBACK TO OLD PUBLIC FILE
      // =========================

      fileBuffer =
        await readFile(
          publicFilePath
        );
    }

    const contentType =
      extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : "image/jpeg";

    return new NextResponse(
      new Uint8Array(fileBuffer),
      {
        status: 200,
        headers: {
          "Content-Type":
            contentType,
          "Content-Disposition":
            "inline",
          "Cache-Control":
            "private, no-store",
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "ADMIN DEPOSIT SCREENSHOT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Screenshot not found.",
      },
      { status: 404 }
    );
  }
}
