import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await connectDB();

    // ================================
    // AUTHENTICATION
    // ================================

    const sessionUserId =
      await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    // ================================
    // REQUEST DATA
    // ================================

    const requestedUserId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const notificationId =
      typeof body.notificationId === "string"
        ? body.notificationId.trim()
        : "";

    // Client userId is allowed only
    // for frontend compatibility.
    if (
      requestedUserId &&
      requestedUserId !== sessionUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    // NEVER trust client userId.
    const userId =
      sessionUserId;

    // ================================
    // VALIDATION
    // ================================

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Notification ID is required.",
        },
        { status: 400 }
      );
    }

    // ================================
    // FIND NOTIFICATION
    // ================================

    const notification =
      await db.orm.public.Notification
        .where({
          id:
            notificationId,
          userId,
        })
        .first();

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Notification not found.",
        },
        { status: 404 }
      );
    }

    // Already read
    if (
      notification.isRead === true
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Notification is already marked as read.",
        notification,
      });
    }

    // ================================
    // MARK AS READ
    // ================================

    const updated =
      await db.orm.public.Notification
        .where({
          id:
            notificationId,
          userId,
        })
        .update({
          isRead: true,
        });

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to mark notification as read.",
        },
        { status: 500 }
      );
    }

    // ================================
    // SUCCESS
    // ================================

    return NextResponse.json({
      success: true,

      message:
        "Notification marked as read.",

      notification:
        updated,
    });
  } catch (error) {
    console.error(
      "NOTIFICATION READ ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to mark notification as read.",
      },
      { status: 500 }
    );
  }
}