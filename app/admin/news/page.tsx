"use client";

import { useEffect, useState } from "react";

type News = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<News[]>([]);

  // Create form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Edit form
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // LOAD NEWS
  // =========================

  async function loadNews() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/news", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load news."
        );
      }

      setNews(
        Array.isArray(data?.news)
          ? data.news
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load news."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  // =========================
  // CREATE NEWS
  // =========================

  async function createNews() {
    setError("");
    setSuccess("");

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      setError("Title and message are required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
          message: cleanMessage,
          active: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to create news."
        );
      }

      setTitle("");
      setMessage("");

      setSuccess("News published successfully.");

      await loadNews();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create news."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================

  function openEditModal(item: News) {
    setError("");
    setSuccess("");

    setEditingNews(item);
    setEditTitle(item.title);
    setEditMessage(item.message);
  }

  // =========================
  // CLOSE EDIT MODAL
  // =========================

  function closeEditModal() {
    if (updating) {
      return;
    }

    setEditingNews(null);
    setEditTitle("");
    setEditMessage("");
  }

  // =========================
  // UPDATE NEWS
  // =========================

  async function updateNews() {
    if (!editingNews) {
      return;
    }

    setError("");
    setSuccess("");

    const cleanTitle = editTitle.trim();
    const cleanMessage = editMessage.trim();

    if (!cleanTitle || !cleanMessage) {
      setError("Title and message are required.");
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch("/api/news", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingNews.id,
          title: cleanTitle,
          message: cleanMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update news."
        );
      }

      setEditingNews(null);
      setEditTitle("");
      setEditMessage("");

      setSuccess("News updated successfully.");

      await loadNews();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update news."
      );
    } finally {
      setUpdating(false);
    }
  }

  // =========================
  // ACTIVATE / DEACTIVATE
  // =========================

  async function toggleNews(item: News) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/news", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          active: !item.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update news."
        );
      }

      setSuccess(
        item.active
          ? "News deactivated successfully."
          : "News activated successfully."
      );

      await loadNews();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update news."
      );
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ================= HEADER ================= */}

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-xl">
              📰
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                News Management
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Manage announcements shown on the user dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* ================= ALERTS ================= */}

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-lg font-bold text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-lg font-bold text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}

        {/* ================= CREATE NEWS ================= */}

        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-zinc-950">
              Create News
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Publish a new announcement for users.
            </p>
          </div>

          <div className="space-y-5">

            {/* TITLE */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                maxLength={200}
                placeholder="Enter news title"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              />

              <div className="mt-1 text-right text-xs text-zinc-400">
                {title.length}/200
              </div>
            </div>

            {/* MESSAGE */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Message
              </label>

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                maxLength={5000}
                rows={5}
                placeholder="Write your announcement..."
                className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              />

              <div className="mt-1 text-right text-xs text-zinc-400">
                {message.length}/5000
              </div>
            </div>

            {/* PUBLISH */}

            <button
              type="button"
              onClick={createNews}
              disabled={saving}
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Publishing..."
                : "📢 Publish News"}
            </button>
          </div>
        </section>

        {/* ================= ALL NEWS ================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          {/* HEADER */}

          <div className="border-b border-zinc-200 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-lg font-bold text-zinc-950">
                  All News
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Manage previously published announcements.
                </p>
              </div>

              <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600">
                {news.length}{" "}
                {news.length === 1
                  ? "News"
                  : "News Items"}
              </div>

            </div>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="px-6 py-12 text-center">

              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />

              <p className="text-sm text-zinc-500">
                Loading news...
              </p>

            </div>
          ) : news.length === 0 ? (

            /* EMPTY */

            <div className="px-6 py-12 text-center">

              <div className="mb-3 text-4xl">
                📰
              </div>

              <p className="text-sm font-semibold text-zinc-700">
                No news has been published yet.
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Create your first announcement above.
              </p>

            </div>
          ) : (

            /* NEWS LIST */

            <div className="divide-y divide-zinc-200">

              {news.map((item) => (
                <article
                  key={item.id}
                  className="p-6 transition hover:bg-zinc-50"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    {/* NEWS CONTENT */}

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-lg font-bold text-zinc-950">
                          {item.title}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.active
                              ? "bg-green-100 text-green-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {item.active
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                        {item.message}
                      </p>

                      <p className="mt-3 text-xs text-zinc-400">
                        Published:{" "}
                        {new Date(
                          item.createdAt
                        ).toLocaleString()}
                      </p>

                    </div>

                    {/* ACTIONS */}

                    <div className="flex shrink-0 flex-wrap gap-2">

                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(item)
                        }
                        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        ✏️ Edit
                      </button>

                      {/* ACTIVATE / DEACTIVATE */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleNews(item)
                        }
                        className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                          item.active
                            ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {item.active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                    </div>
                  </div>
                </article>
              ))}

            </div>
          )}
        </section>
      </div>

      {/* ================= EDIT MODAL ================= */}

      {editingNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
        >

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-zinc-950">
                  Edit News
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Update this announcement.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={updating}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xl text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="space-y-5 p-6">

              {/* TITLE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Title
                </label>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) =>
                    setEditTitle(e.target.value)
                  }
                  maxLength={200}
                  disabled={updating}
                  placeholder="Enter news title"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-100"
                />

                <div className="mt-1 text-right text-xs text-zinc-400">
                  {editTitle.length}/200
                </div>
              </div>

              {/* MESSAGE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Message
                </label>

                <textarea
                  value={editMessage}
                  onChange={(e) =>
                    setEditMessage(e.target.value)
                  }
                  maxLength={5000}
                  rows={7}
                  disabled={updating}
                  placeholder="Write your announcement..."
                  className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-100"
                />

                <div className="mt-1 text-right text-xs text-zinc-400">
                  {editMessage.length}/5000
                </div>
              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={closeEditModal}
                disabled={updating}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={updateNews}
                disabled={updating}
                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating
                  ? "Saving..."
                  : "💾 Save Changes"}
              </button>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}