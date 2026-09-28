import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "File is required.",
        },
        { status: 400 }
      );
    }

    // =========================
    // VERCEL BLOB
    // =========================

    let pathname = file;

    // If database contains full Blob URL,
    // extract only the pathname.
    if (
      pathname.startsWith("http://") ||
      pathname.startsWith("https://")
    ) {
      try {
        const blobUrl = new URL(pathname);

        pathname = decodeURIComponent(
          blobUrl.pathname.replace(/^\/+/, "")
        );
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Blob URL.",
          },
          { status: 400 }
        );
      }
    }

    // =========================
    // SECURITY
    // =========================

    if (
      !pathname.startsWith("deposits/") ||
      pathname.includes("..") ||
      pathname.includes("\\")
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
    // GET PRIVATE BLOB
    // =========================

    const result = await get(pathname, {
      access: "private",
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Screenshot not found.",
        },
        { status: 404 }
      );
    }

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type":
          result.blob.contentType ||
          "application/octet-stream",

        "Content-Disposition":
          "inline",

        "Cache-Control":
          "private, no-store",

        "X-Content-Type-Options":
          "nosniff",
      },
    });
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