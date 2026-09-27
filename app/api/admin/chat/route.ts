import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function parseChatMessage(message: string) {
  try {
    const parsed = JSON.parse(message);

    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === "CHAT_MESSAGE"
    ) {
      return {
        text:
          typeof parsed.text === "string"
            ? parsed.text
            : "",
        image:
          typeof parsed.image === "string"
            ? parsed.image
            : null,
      };
    }
  } catch {
    // Old normal text message
  }

  return {
    text: message,
    image: null,
  };
}

/* =========================================================
   GET ADMIN CHAT
   ========================================================= */

export async function GET(request: Request) {
  try {
    // -----------------------------------------------------
    // ADMIN AUTHENTICATION
    // -----------------------------------------------------

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

    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams.get("userId")?.trim() || "";

    // =====================================================
    // ONE USER CHAT
    // =====================================================

    if (userId) {
      const user =
        await db.orm.public.User
          .where({
            id: userId,
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

      const messages =
        await db.orm.public.ChatMessage
          .where({
            userId,
          })
          .all();

      // ---------------------------------------------------
      // Mark USER messages as read
      // ---------------------------------------------------

      for (const item of messages) {
        if (
          String(
            item.senderType || ""
          ).toUpperCase() === "USER" &&
          item.isRead !== true
        ) {
          await db.orm.public.ChatMessage
            .where({
              id: item.id,
              userId,
            })
            .update({
              isRead: true,
            });
        }
      }

      // ---------------------------------------------------
      // Keep existing chat display order
      // ---------------------------------------------------

      const formattedMessages =
        [...messages]
          .reverse()
          .map((item: any) => {
            const parsed =
              parseChatMessage(
                item.message
              );

            return {
              id: item.id,
              userId: item.userId,

              senderType:
                String(
                  item.senderType || ""
                ).toUpperCase(),

              message: parsed.text,
              image: parsed.image,

              isRead:
                item.isRead === true,
            };
          });

      return NextResponse.json({
        success: true,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },

        messages:
          formattedMessages,
      });
    }

    // =====================================================
    // ALL USERS
    // =====================================================

    const users =
      await db.orm.public.User.all();

    const result: any[] = [];

    for (const user of users) {
      const messages =
        await db.orm.public.ChatMessage
          .where({
            userId: user.id,
          })
          .all();

      const unreadCount =
        messages.filter(
          (item: any) =>
            String(
              item.senderType || ""
            ).toUpperCase() === "USER" &&
            item.isRead !== true
        ).length;

      const lastRaw =
        messages.length > 0
          ? messages[messages.length - 1]
          : null;

      let lastMessage = null;

      if (lastRaw) {
        const parsed =
          parseChatMessage(
            lastRaw.message
          );

        lastMessage = {
          id: lastRaw.id,
          userId: lastRaw.userId,

          senderType:
            String(
              lastRaw.senderType || ""
            ).toUpperCase(),

          message: parsed.text,
          image: parsed.image,

          isRead:
            lastRaw.isRead === true,
        };
      }

      result.push({
        id: user.id,
        name: user.name,
        email: user.email,
        unreadCount,
        lastMessage,
      });
    }

    return NextResponse.json({
      success: true,
      users: result,
    });
  } catch (error) {
    console.error(
      "ADMIN CHAT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load chats.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST ADMIN MESSAGE
   ========================================================= */

export async function POST(request: Request) {
  try {
    // -----------------------------------------------------
    // ADMIN AUTHENTICATION
    // -----------------------------------------------------

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

    await connectDB();

    const body =
      await request.json();

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const text =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const image =
      typeof body?.image === "string"
        ? body.image
        : null;

    // -----------------------------------------------------
    // Validate User ID
    // -----------------------------------------------------

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------
    // Validate Message
    // -----------------------------------------------------

    if (!text && !image) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Message or image is required.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------
    // Text Limit
    // -----------------------------------------------------

    if (text.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is too long.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------
    // Image Validation
    // -----------------------------------------------------

    if (image) {
      if (
        !image.startsWith("data:image/")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only image files are allowed.",
          },
          { status: 400 }
        );
      }

      if (
        image.length >
        MAX_IMAGE_SIZE * 1.4
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Image is too large. Maximum size is 2MB.",
          },
          { status: 400 }
        );
      }
    }

    // -----------------------------------------------------
    // Check User
    // -----------------------------------------------------

    const user =
      await db.orm.public.User
        .where({
          id: userId,
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

    // -----------------------------------------------------
    // Store Message
    // -----------------------------------------------------

    const storedMessage =
      JSON.stringify({
        type: "CHAT_MESSAGE",
        text,
        image,
      });

    const newMessage =
      await db.orm.public.ChatMessage.create({
        userId,
        senderType: "ADMIN",
        message: storedMessage,
        isRead: false,
      });

    // -----------------------------------------------------
    // Success
    // -----------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message: {
          id: newMessage.id,
          userId:
            newMessage.userId,

          senderType:
            "ADMIN",

          message: text,

          image,

          isRead: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ADMIN CHAT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send reply.",
      },
      { status: 500 }
    );
  }
}