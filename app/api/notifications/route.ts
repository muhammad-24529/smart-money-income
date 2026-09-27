import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sessionUserId = await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await db.orm.public.User
      .where({
        id: sessionUserId,
      })
      .first();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const notifications =
      await db.orm.public.Notification
        .where({
          userId: sessionUserId,
        })
        .all();

    const sortedNotifications = [
      ...notifications,
    ].reverse();

    const unreadCount =
      sortedNotifications.filter(
        (notification: any) =>
          notification.isRead !== true
      ).length;

    return NextResponse.json({
      success: true,
      notifications: sortedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "NOTIFICATIONS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load notifications.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getUserSession();

    if (!sessionUserId) {
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

    if (!title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and message are required.",
        },
        { status: 400 }
      );
    }

    const notification =
      await db.orm.public.Notification.create({
        userId: sessionUserId,
        title,
        message,
        isRead: false,
      });

    return NextResponse.json(
      {
        success: true,
        message: "Notification created successfully.",
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "NOTIFICATION CREATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create notification.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  try {
    const sessionUserId = await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const notifications =
      await db.orm.public.Notification
        .where({
          userId: sessionUserId,
        })
        .all();

    let updatedCount = 0;

    for (const notification of notifications) {
      if (!notification.isRead) {
        await db.orm.public.Notification
          .where({
            id: notification.id,
            userId: sessionUserId,
          })
          .update({
            isRead: true,
          });

        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount,
    });
  } catch (error) {
    console.error(
      "NOTIFICATIONS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update notifications.",
      },
      { status: 500 }
    );
  }
}