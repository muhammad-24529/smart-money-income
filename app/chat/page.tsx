"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  id: string;
  userId: string;
  senderType: "USER" | "ADMIN";
  message: string;
  image: string | null;
  isRead: boolean;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function ChatPage() {
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const chatRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  function getUserId() {
    try {
      const savedUser =
        localStorage.getItem("smi_user") ||
        sessionStorage.getItem("smi_user");

      if (savedUser) {
        const parsed = JSON.parse(savedUser);

        if (parsed?.id) {
          return String(parsed.id);
        }
      }
    } catch {
      // Ignore invalid saved user
    }

    return (
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      sessionStorage.getItem("userId") ||
      ""
    );
  }

  function scrollToBottom(
    behavior: ScrollBehavior = "auto"
  ) {
    const element = chatRef.current;

    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior,
      });
    });
  }

  async function loadMessages(
    id: string,
    initial = false
  ) {
    try {
      if (initial) {
        setLoading(true);
      }

      const response = await fetch(
        `/api/chat?userId=${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load chat."
        );
      }

      const incomingMessages: ChatMessage[] =
        Array.isArray(data.messages)
          ? data.messages
          : [];

      setMessages(incomingMessages);

      setTimeout(() => {
        scrollToBottom(
          initial ? "auto" : "smooth"
        );
      }, 100);
    } catch (err) {
      console.error("CHAT LOAD ERROR:", err);

      if (initial) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load chat."
        );
      }
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const id = getUserId();

    if (!id) {
      window.location.href = "/login";
      return;
    }

    setUserId(id);

    loadMessages(id, true);

    const interval = setInterval(() => {
      loadMessages(id, false);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 2MB.");
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImage(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendMessage(
    event: FormEvent
  ) {
    event.preventDefault();

    const text = message.trim();

    if (!text && !selectedImage) {
      return;
    }

    if (!userId) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          message: text,
          image: selectedImage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to send message."
        );
      }

      setMessages((previous) => {
        const exists = previous.some(
          (item) => item.id === data.message.id
        );

        if (exists) {
          return previous;
        }

        return [...previous, data.message];
      });

      setMessage("");
      setSelectedImage(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    } catch (err) {
      console.error("CHAT SEND ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex h-[100dvh] w-full items-center justify-center bg-[#efeae2]">
        <div className="text-center">
          <div className="mb-3 text-4xl">💬</div>

          <p className="font-semibold text-gray-600">
            Loading chat...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#efeae2]">

      {/* HEADER */}
      <header className="z-30 flex h-16 shrink-0 items-center gap-3 bg-[#075e54] px-4 text-white shadow">

        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10"
        >
          ←
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl">
          👨‍💼
        </div>

        <div className="min-w-0">
          <h1 className="truncate font-bold">
            Support Team
          </h1>

          <p className="text-xs text-green-100">
            Online • Live Chat
          </p>
        </div>
      </header>

      {/* CHAT BODY */}
      <div className="min-h-0 flex-1 overflow-hidden">

        <div
          ref={chatRef}
          className="h-full overflow-y-auto"
        >

          {/* CENTER CHAT AREA */}
          <div className="mx-auto flex min-h-full w-full max-w-[600px] flex-col px-3 py-4">

            {/* PUSH MESSAGES DOWN */}
            <div className="flex-1" />

            {messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="rounded-xl bg-white px-5 py-4 text-center text-sm text-gray-600 shadow">
                  <div className="mb-1 text-2xl">
                    👋
                  </div>

                  <div className="font-semibold">
                    Hello!
                  </div>

                  <div>
                    How can we help you?
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">

                {messages.map((item) => {
                  const isUser =
                    String(item.senderType).toUpperCase() ===
                    "USER";

                  return (
                    <div
                      key={item.id}
                      className={`flex w-full ${
                        isUser
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      {/* MESSAGE */}
                      <div
                        className={`
                          w-fit
                          max-w-[75%]
                          rounded-2xl
                          px-3
                          py-2
                          shadow-sm
                          ${
                            isUser
                              ? "rounded-br-md bg-[#d9fdd3]"
                              : "rounded-bl-md bg-white"
                          }
                        `}
                      >

                        {item.image && (
                          <img
                            src={item.image}
                            alt="Chat attachment"
                            className="mb-1 max-h-64 max-w-[240px] rounded-lg object-contain"
                          />
                        )}

                        {item.message && (
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-5 text-gray-800">
                            {item.message}
                          </p>
                        )}

                      </div>
                    </div>
                  );
                })}

              </div>
            )}

            <div className="h-2 shrink-0" />
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="z-30 shrink-0 bg-red-100 px-4 py-2 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {selectedImage && (
        <div className="z-30 shrink-0 border-t bg-white px-4 py-2">
          <div className="relative inline-block">

            <img
              src={selectedImage}
              alt="Preview"
              className="h-20 w-20 rounded-lg object-cover"
            />

            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
            >
              ×
            </button>

          </div>
        </div>
      )}

      {/* INPUT */}
      <form
        onSubmit={sendMessage}
        className="z-30 flex min-h-[60px] shrink-0 items-center gap-2 border-t bg-[#f0f2f5] px-2 py-2 sm:px-4"
      >

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-gray-200"
        >
          📷
        </button>

        <input
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          placeholder="Type a message"
          maxLength={2000}
          disabled={sending}
          className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={
            sending ||
            (!message.trim() &&
              !selectedImage)
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#075e54] text-xl text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "…" : "➤"}
        </button>

      </form>
    </main>
  );
}