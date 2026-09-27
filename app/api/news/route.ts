import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { validateRequestOrigin } from "@/lib/security/csrf";

export const runtime = "nodejs";

// GET
// Normal users: active news only
// Admin: all news
export async function GET() {
  try {
    await connectDB();

    const admin = await isAdminAuthenticated();

    if (admin) {
      const news = await db.orm.public.News.all();

      return NextResponse.json({
        success: true,
        news: [...news].reverse(),
      });
    }

    const userId = await getUserSession();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const user = await db.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const news = await db.orm.public.News.where({
      active: true,
    }).all();

    return NextResponse.json({
      success: true,
      news: [...news].reverse(),
    });
  } catch (error) {
    console.error("NEWS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load news.",
      },
      { status: 500 }
    );
  }
}

// POST
// Admin creates news
export async function POST(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }

    const admin = await isAdminAuthenticated();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const active =
      typeof body?.active === "boolean"
        ? body.active
        : true;

    if (!title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and message are required.",
        },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Title is too long.",
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is too long.",
        },
        { status: 400 }
      );
    }

    const news = await db.orm.public.News.create({
      title,
      message,
      active,
    });

    return NextResponse.json(
      {
        success: true,
        message: "News created successfully.",
        news,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("NEWS CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create news.",
      },
      { status: 500 }
    );
  }
}

// PATCH
// Admin updates news
export async function PATCH(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }

    const admin = await isAdminAuthenticated();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const id =
      typeof body?.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "News ID is required.",
        },
        { status: 400 }
      );
    }

    const existing = await db.orm.public.News.where({
      id,
    }).first();

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "News not found.",
        },
        { status: 404 }
      );
    }

    const updateData: {
      title?: string;
      message?: string;
      active?: boolean;
    } = {};

    if (typeof body?.title === "string") {
      const title = body.title.trim();

      if (!title) {
        return NextResponse.json(
          {
            success: false,
            error: "Title cannot be empty.",
          },
          { status: 400 }
        );
      }

      if (title.length > 200) {
        return NextResponse.json(
          {
            success: false,
            error: "Title is too long.",
          },
          { status: 400 }
        );
      }

      updateData.title = title;
    }

    if (typeof body?.message === "string") {
      const message = body.message.trim();

      if (!message) {
        return NextResponse.json(
          {
            success: false,
            error: "Message cannot be empty.",
          },
          { status: 400 }
        );
      }

      if (message.length > 5000) {
        return NextResponse.json(
          {
            success: false,
            error: "Message is too long.",
          },
          { status: 400 }
        );
      }

      updateData.message = message;
    }

    if (typeof body?.active === "boolean") {
      updateData.active = body.active;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No changes provided.",
        },
        { status: 400 }
      );
    }

    const news = await db.orm.public.News.where({
      id,
    }).update(updateData);

    return NextResponse.json({
      success: true,
      message: "News updated successfully.",
      news,
    });
  } catch (error) {
    console.error("NEWS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update news.",
      },
      { status: 500 }
    );
  }
}

// DELETE
// Admin deactivates news instead of physically deleting it
export async function DELETE(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }

    const admin = await isAdminAuthenticated();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const id =
      typeof body?.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "News ID is required.",
        },
        { status: 400 }
      );
    }

    const existing = await db.orm.public.News.where({
      id,
    }).first();

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "News not found.",
        },
        { status: 404 }
      );
    }

    const news = await db.orm.public.News.where({
      id,
    }).update({
      active: false,
    });

    return NextResponse.json({
      success: true,
      message: "News deactivated successfully.",
      news,
    });
  } catch (error) {
    console.error("NEWS DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to deactivate news.",
      },
      { status: 500 }
    );
  }
}