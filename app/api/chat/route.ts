import { validateRequestOrigin } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/user";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

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
    // Old normal message
  }

  return {
    text: message,
    image: null,
  };
}

/* =========================================================
   GET USER CHAT MESSAGES
   ========================================================= */

export async function GET(request: Request) {
  try {
    await connectDB();

    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const sessionUserId = await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------------
    // Client userId - compatibility only
    // -----------------------------------------------------

    const { searchParams } = new URL(request.url);

    const requestedUserId =
      searchParams.get("userId")?.trim() || "";

    if (
      requestedUserId &&
      requestedUserId !== sessionUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    // NEVER trust client userId.
    const userId = sessionUserId;

    // -----------------------------------------------------
    // Check user
    // -----------------------------------------------------

    const user = await db.orm.public.User
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

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is inactive.",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------------
    // Get messages
    // -----------------------------------------------------

    const messages =
      await db.orm.public.ChatMessage
        .where({
          userId,
        })
        .all();

    /*
      IMPORTANT:
      Do NOT reverse here.

      We keep the database result order.
    */

    const formattedMessages = messages.map(
      (item: any) => {
        const parsed = parseChatMessage(
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
      }
    );

    // -----------------------------------------------------
    // Mark ADMIN messages as read
    // -----------------------------------------------------

    for (const item of messages) {
      if (
        String(
          item.senderType || ""
        ).toUpperCase() === "ADMIN" &&
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

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error(
      "CHAT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load chat.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST USER MESSAGE
   ========================================================= */

export async function POST(request: Request) {
  // -----------------------------------------------------
  // CSRF / Origin protection
  // -----------------------------------------------------

  const originError = validateRequestOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    await connectDB();

    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const sessionUserId = await getUserSession();

    if (!sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // -----------------------------------------------------
    // Client userId - compatibility only
    // -----------------------------------------------------

    const requestedUserId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    if (
      requestedUserId &&
      requestedUserId !== sessionUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access.",
        },
        { status: 403 }
      );
    }

    // NEVER trust client userId.
    const userId = sessionUserId;

    // -----------------------------------------------------
    // Message
    // -----------------------------------------------------

    const text =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const image =
      typeof body?.image === "string"
        ? body.image
        : null;

    // -----------------------------------------------------
    // Validate message
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
    // Text limit
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
    // Image validation
    // -----------------------------------------------------

    if (image) {
      if (!image.startsWith("data:image/")) {
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
    // Check user
    // -----------------------------------------------------

    const user = await db.orm.public.User
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

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is inactive.",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------------
    // Store message
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
        senderType: "USER",
        message: storedMessage,
        isRead: false,
      });

    return NextResponse.json(
      {
        success: true,

        message: {
          id: newMessage.id,
          userId: newMessage.userId,

          senderType: "USER",

          message: text,

          image,

          isRead: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CHAT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message.",
      },
      { status: 500 }
    );
  }
}