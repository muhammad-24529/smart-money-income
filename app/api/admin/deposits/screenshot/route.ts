import { isAdminAuthenticated } from "@/lib/admin/auth";
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

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

    let pathname = file;

    // =========================
    // FULL BLOB URL
    // =========================

    if (
      pathname.startsWith("https://") ||
      pathname.startsWith("http://")
    ) {
      try {
        const blobUrl =
          new URL(pathname);

        pathname =
          decodeURIComponent(
            blobUrl.pathname.replace(
              /^\/+/,
              ""
            )
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
    // OLD FILENAME SUPPORT
    // =========================

    // If database contains only:
    // deposit-xxxx.jpg
    //
    // convert it to:
    // deposits/deposit-xxxx.jpg

    if (
      !pathname.startsWith("deposits/")
    ) {
      pathname =
        `deposits/${pathname}`;
    }

    // =========================
    // SECURITY
    // =========================

    if (
      pathname.includes("..") ||
      pathname.includes("\\") ||
      !pathname.startsWith("deposits/")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file path.",
        },
        { status: 400 }
      );
    }

    const fileName =
      pathname.split("/").pop() || "";

    const extension =
      fileName
        .slice(
          fileName.lastIndexOf(".")
        )
        .toLowerCase();

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
    // PRIVATE VERCEL BLOB
    // =========================

    const result =
      await get(pathname, {
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

    return new NextResponse(
      result.stream,
      {
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