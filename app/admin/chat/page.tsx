"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatUser = {
  id: string;
  name: string;
  email: string;
  unreadCount: number;

  lastMessage: {
    id: string;
    message: string;
    senderType: "USER" | "ADMIN";
    image: string | null;
    isRead: boolean;
  } | null;
};

type ChatMessage = {
  id: string;
  userId: string;
  senderType: "USER" | "ADMIN";
  message: string;
  image: string | null;
  isRead: boolean;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function AdminChatPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] =
    useState<ChatUser | null>(null);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const chatRef = useRef<HTMLDivElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  function scrollToBottom(
    behavior: ScrollBehavior = "auto"
  ) {
    const element = chatRef.current;

    if (!element) return;

    if (behavior === "smooth") {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    } else {
      element.scrollTop = element.scrollHeight;
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch(
        "/api/admin/chat",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load users."
        );
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load users."
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadMessages(
    userId: string
  ) {
    try {
      setLoadingMessages(true);

      const response = await fetch(
        `/api/admin/chat?userId=${encodeURIComponent(
          userId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load messages."
        );
      }

      setMessages(data.messages || []);

      setTimeout(() => {
        scrollToBottom("auto");
      }, 100);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load messages."
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadUsers();

    const interval = setInterval(() => {
      loadUsers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedUser?.id) return;

    loadMessages(selectedUser.id);

    const interval = setInterval(() => {
      loadMessages(selectedUser.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUser?.id]);

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom("auto");
    }, 100);
  }, [messages]);

  function selectUser(user: ChatUser) {
    setSelectedUser(user);
    setMessages([]);
    setError("");

    setTimeout(() => {
      scrollToBottom("auto");
    }, 100);
  }

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

    if (!selectedUser) return;

    const text = message.trim();

    if (!text && !selectedImage) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            message: text,
            image: selectedImage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to send message."
        );
      }

      setMessages((previous) => [
        ...previous,
        data.message,
      ]);

      setMessage("");
      setSelectedImage(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);

      loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-gray-100">
      {/* ============================= */}
      {/* USER LIST */}
      {/* ============================= */}

      <aside
        className={`w-full shrink-0 border-r bg-white md:w-80 ${
          selectedUser
            ? "hidden md:flex"
            : "flex"
        } flex-col`}
      >
        <div className="shrink-0 bg-[#075e54] px-4 py-4 text-gray-900">
          <h1 className="text-xl font-bold">
            💬 Live Chats
          </h1>

          <p className="text-xs text-green-100">
            User Support
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingUsers ? (
            <div className="p-6 text-center text-gray-500">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users yet.
            </div>
          ) : (
            users.map((user) => {
              const active =
                selectedUser?.id === user.id;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() =>
                    selectUser(user)
                  }
                  className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-gray-100 ${
                    active
                      ? "bg-gray-100"
                      : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#075e54] font-bold text-gray-900">
                    {user.name
                      ?.charAt(0)
                      ?.toUpperCase() || "U"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-gray-800">
                        {user.name}
                      </p>

                      {user.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-xs text-gray-900">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>

                    <p className="truncate text-xs text-gray-500">
                      {user.lastMessage?.image &&
                      !user.lastMessage.message
                        ? "📷 Image"
                        : user.lastMessage?.message ||
                          "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ============================= */}
      {/* CHAT */}
      {/* ============================= */}

      <section
        className={`min-w-0 flex-1 ${
          selectedUser
            ? "flex"
            : "hidden md:flex"
        } flex-col bg-[#efeae2]`}
      >
        {!selectedUser ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="mb-3 text-6xl">
                💬
              </div>

              <p className="font-semibold">
                Select a user to start chatting
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* CHAT HEADER */}
            <header className="flex shrink-0 items-center gap-3 bg-[#075e54] px-4 py-3 text-gray-900">
              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
                className="text-2xl md:hidden"
              >
                ←
              </button>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-bold">
                {selectedUser.name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-bold">
                  {selectedUser.name}
                </h2>

                <p className="truncate text-xs text-green-100">
                  {selectedUser.email}
                </p>
              </div>
            </header>

            {/* ========================= */}
            {/* MESSAGE AREA */}
            {/* ========================= */}

            <div
              ref={chatRef}
              className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
            >
              {/*
                THIS IS THE IMPORTANT PART.

                Messages stay at bottom when
                there are only a few messages.
              */}

              <div className="flex min-h-full flex-col justify-end">
                <div className="mx-auto w-full max-w-3xl space-y-2">
                  {loadingMessages ? (
                    <div className="py-5 text-center text-gray-500">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mx-auto w-fit rounded-xl bg-white px-4 py-3 text-center text-sm text-gray-500 shadow">
                      No messages yet.
                    </div>
                  ) : (
                    messages.map((item) => {
                      const isAdmin =
                        item.senderType ===
                        "ADMIN";

                      return (
                        <div
                          key={item.id}
                          className={`flex w-full ${
                            isAdmin
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[65%] ${
                              isAdmin
                                ? "rounded-br-sm bg-[#d9fdd3]"
                                : "rounded-bl-sm bg-white"
                            }`}
                          >
                            {item.image && (
                              <img
                                src={item.image}
                                alt="Chat attachment"
                                className="mb-2 max-h-80 max-w-full rounded-lg object-contain"
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
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="shrink-0 bg-red-100 px-4 py-2 text-center text-sm text-red-700">
                {error}
              </div>
            )}

            {/* IMAGE PREVIEW */}
            {selectedImage && (
              <div className="shrink-0 border-t bg-white px-4 py-2">
                <div className="relative inline-block">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="h-20 w-20 rounded-lg object-cover"
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-gray-900"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* INPUT */}
            <form
              onSubmit={sendMessage}
              className="flex shrink-0 items-center gap-2 border-t bg-[#f0f2f5] px-2 py-2 sm:px-4"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#075e54] text-xl text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "…" : "➤"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
