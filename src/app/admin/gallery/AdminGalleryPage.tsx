"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiEye,
  FiEyeOff,
  FiHome,
  FiImage,
  FiPlus,
  FiSave,
  FiStar,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { revalidateGallery } from "@/lib/revalidate";
import {
  galleryStoragePath,
  photoTitleFromFilename,
  slugifyGallery,
  type GalleryCollection,
  type GalleryPhoto,
} from "@/lib/gallery";

type CollectionRow = GalleryCollection & {
  gallery_photos: { count: number }[];
};
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Gallery admin: create collections (Makkah, Madinah, a specific hotel ...),
 * upload photos into them, and choose which appear on the home page.
 *
 * Follows the same shape as ../content/AdminContentPage.tsx — inline draft
 * state per card, an explicit Save once a field is dirty, sort_order swapped
 * between neighbours for reordering, a two-step confirm before delete.
 */
export default function AdminGalleryPage() {
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [photosByCollection, setPhotosByCollection] = useState<
    Record<string, GalleryPhoto[]>
  >({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  // Slug-collision validation for the "new collection" input, shown right
  // below it — see docs/notifications-plan.md §2 on why this stays inline
  // rather than becoming a toast that could appear far from the field it's
  // about.
  const [addError, setAddError] = useState("");
  // Reserved for page-load failure — write outcomes go through toast, see
  // afterWrite below.
  const [error, setError] = useState("");
  const toast = useToast();

  // Collections carry a photo count (via the embedded gallery_photos(count)),
  // not their photo rows — a gallery past 1000 photos would otherwise hit
  // PostgREST's default page size and silently truncate. A collection's
  // photos load only once it is expanded, in the effect below.
  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email ?? null);
    if (!userData.user) {
      setIsLoading(false);
      return;
    }

    const { data: collectionRows } = await supabase
      .from("gallery_collections")
      .select("*, gallery_photos(count)")
      .order("sort_order", { ascending: true });

    const rows = (collectionRows as CollectionRow[]) ?? [];
    setCollections(rows);
    setPhotoCounts(
      Object.fromEntries(
        rows.map((row) => [row.id, row.gallery_photos?.[0]?.count ?? 0]),
      ),
    );
    setIsLoading(false);
  }, [supabase]);

  const loadPhotos = useCallback(
    async (collectionId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("collection_id", collectionId)
        .order("sort_order", { ascending: true });
      setPhotosByCollection((prev) => ({
        ...prev,
        [collectionId]: (data as GalleryPhoto[]) ?? [],
      }));
    },
    [supabase],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (expandedId) void loadPhotos(expandedId);
  }, [expandedId, loadPhotos]);

  /**
   * Every write clears the public cache, so the site is current immediately.
   * `problem` surfaces a partial failure (an upload that failed, a file that
   * could not be removed) alongside an otherwise-successful write — pass it
   * instead of a separate setError so it isn't blanked by the line below.
   */
  async function afterWrite(text: string, problem = "", key?: string) {
    await revalidateGallery();
    // Keyed so a held reorder arrow collapses to one toast instead of one per
    // click.
    toast.success(text, key ? { key } : undefined);
    if (problem) toast.error(problem);
    void load();
    if (expandedId) void loadPhotos(expandedId);
  }

  /* ----------------------------------------------------------- collections */

  async function addCollection() {
    if (!supabase) return;
    const title = newTitle.trim();
    // The button is disabled while newTitle is blank, so this only fires for
    // a title that's all punctuation/whitespace once slugified.
    const slug = slugifyGallery(title);
    if (!slug)
      return setAddError(
        "That name doesn't produce a usable URL — add a letter or number.",
      );
    if (collections.some((collection) => collection.slug === slug))
      return setAddError(
        `A collection with the slug "${slug}" already exists.`,
      );

    setAddError("");
    const nextOrder = Math.max(0, ...collections.map((c) => c.sort_order)) + 10;
    const { error: insertError } = await supabase
      .from("gallery_collections")
      .insert({
        slug,
        title,
        sort_order: nextOrder,
      });
    if (insertError)
      return toast.error("Could not create the collection.", {
        description: insertError.message,
      });
    setNewTitle("");
    await afterWrite(`"${title}" created. Upload its photos below.`);
  }

  async function saveCollection(
    collection: GalleryCollection,
    changes: { title: string; location: string; description: string },
  ) {
    if (!supabase) return;
    // The card's Save button is disabled while its title is blank (see
    // CollectionCard), so this is unreachable in the ordinary flow.
    if (!changes.title.trim()) return;

    const { error: updateError } = await supabase
      .from("gallery_collections")
      .update({
        title: changes.title.trim(),
        location: changes.location.trim(),
        description: changes.description.trim(),
      })
      .eq("id", collection.id);
    if (updateError)
      return toast.error("Could not save that collection.", {
        description: updateError.message,
      });
    await afterWrite(`"${changes.title.trim()}" updated.`);
  }

  async function togglePublished(collection: GalleryCollection) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("gallery_collections")
      .update({ is_published: !collection.is_published })
      .eq("id", collection.id);
    if (updateError)
      return toast.error("Could not update that collection.", {
        description: updateError.message,
      });
    await afterWrite(
      collection.is_published
        ? `"${collection.title}" hidden from the site.`
        : `"${collection.title}" is now live.`,
    );
  }

  async function toggleShowOnHome(collection: GalleryCollection) {
    if (!supabase) return;
    const turningOn = !collection.show_on_home;
    const homeSortOrder = turningOn
      ? Math.max(
          0,
          ...collections
            .filter((c) => c.show_on_home)
            .map((c) => c.home_sort_order),
        ) + 10
      : collection.home_sort_order;

    const { error: updateError } = await supabase
      .from("gallery_collections")
      .update({ show_on_home: turningOn, home_sort_order: homeSortOrder })
      .eq("id", collection.id);
    if (updateError)
      return toast.error("Could not update that collection.", {
        description: updateError.message,
      });
    await afterWrite(
      turningOn
        ? `"${collection.title}" now appears on the home page.`
        : `"${collection.title}" removed from the home page.`,
    );
  }

  async function moveCollection(
    collection: GalleryCollection,
    direction: -1 | 1,
  ) {
    if (!supabase) return;
    const ordered = [...collections].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const index = ordered.findIndex((item) => item.id === collection.id);
    const swapWith = ordered[index + direction];
    if (!swapWith) return;

    const [first, second] = await Promise.all([
      supabase
        .from("gallery_collections")
        .update({ sort_order: swapWith.sort_order })
        .eq("id", collection.id),
      supabase
        .from("gallery_collections")
        .update({ sort_order: collection.sort_order })
        .eq("id", swapWith.id),
    ]);
    const failure = first.error ?? second.error;
    if (failure)
      return toast.error("Could not reorder.", {
        description: `The order may be inconsistent: ${failure.message}`,
      });
    await afterWrite("Order on /gallery updated.", "", "gallery-reorder");
  }

  async function moveHomeCollection(
    collection: GalleryCollection,
    direction: -1 | 1,
  ) {
    if (!supabase) return;
    const featured = collections
      .filter((c) => c.show_on_home)
      .sort((a, b) => a.home_sort_order - b.home_sort_order);
    const index = featured.findIndex((item) => item.id === collection.id);
    const swapWith = featured[index + direction];
    if (!swapWith) return;

    const [first, second] = await Promise.all([
      supabase
        .from("gallery_collections")
        .update({ home_sort_order: swapWith.home_sort_order })
        .eq("id", collection.id),
      supabase
        .from("gallery_collections")
        .update({ home_sort_order: collection.home_sort_order })
        .eq("id", swapWith.id),
    ]);
    const failure = first.error ?? second.error;
    if (failure)
      return toast.error("Could not reorder.", {
        description: `The order may be inconsistent: ${failure.message}`,
      });
    await afterWrite("Order on the home page updated.", "", "home-reorder");
  }

  async function setCover(collection: GalleryCollection, photo: GalleryPhoto) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("gallery_collections")
      .update({ cover_image_url: photo.image_url })
      .eq("id", collection.id);
    if (updateError)
      return toast.error("Could not set the cover photo.", {
        description: updateError.message,
      });
    await afterWrite(`Cover photo set for "${collection.title}".`);
  }

  async function deleteCollection(collection: GalleryCollection) {
    if (!supabase) return;

    // Read the paths fresh rather than trusting client state (which may be
    // stale or, past 1000 photos, truncated by PostgREST's default page size),
    // and read them before the row delete removes the ability to look them up.
    const { data: photoRows } = await supabase
      .from("gallery_photos")
      .select("storage_path")
      .eq("collection_id", collection.id);
    const paths = (photoRows ?? [])
      .map((row) => row.storage_path as string)
      .filter(Boolean);

    // Row first: a leaked file is invisible, but a row deleted after a failed
    // file removal would leave live pages pointing at photos that vanished
    // with no way to fix it from here.
    const { error: deleteError } = await supabase
      .from("gallery_collections")
      .delete()
      .eq("id", collection.id);
    if (deleteError)
      return toast.error("Could not delete that collection.", {
        description: deleteError.message,
      });
    if (expandedId === collection.id) setExpandedId(null);

    let problem = "";
    if (paths.length) {
      const { error: storageError } = await supabase.storage
        .from("gallery-images")
        .remove(paths);
      if (storageError)
        problem = `Collection deleted, but ${paths.length} file(s) remain in storage: ${storageError.message}`;
    }
    await afterWrite(`"${collection.title}" and its photos deleted.`, problem);
  }

  /* ----------------------------------------------------------------- photos */

  async function saveCover(collection: GalleryCollection, photo: GalleryPhoto) {
    await setCover(collection, photo);
  }

  async function savePhoto(
    photo: GalleryPhoto,
    changes: { title: string; caption: string },
  ) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("gallery_photos")
      .update({ title: changes.title.trim(), caption: changes.caption.trim() })
      .eq("id", photo.id);
    if (updateError)
      return toast.error("Could not save that photo.", {
        description: updateError.message,
      });
    await afterWrite("Photo updated.");
  }

  async function movePhoto(
    collection: GalleryCollection,
    photo: GalleryPhoto,
    direction: -1 | 1,
  ) {
    if (!supabase) return;
    const ordered = [...(photosByCollection[collection.id] ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const index = ordered.findIndex((item) => item.id === photo.id);
    const swapWith = ordered[index + direction];
    if (!swapWith) return;

    const [first, second] = await Promise.all([
      supabase
        .from("gallery_photos")
        .update({ sort_order: swapWith.sort_order })
        .eq("id", photo.id),
      supabase
        .from("gallery_photos")
        .update({ sort_order: photo.sort_order })
        .eq("id", swapWith.id),
    ]);
    const failure = first.error ?? second.error;
    if (failure)
      return toast.error("Could not reorder.", {
        description: `The order may be inconsistent: ${failure.message}`,
      });
    await afterWrite("Photo order updated.", "", "photo-reorder");
  }

  async function deletePhoto(
    collection: GalleryCollection,
    photo: GalleryPhoto,
  ) {
    if (!supabase) return;

    // Row first, same reasoning as deleteCollection: a broken image on a
    // published page is worse than a leaked file, so the row must not survive
    // a storage removal that then fails.
    const { error: deleteError } = await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", photo.id);
    if (deleteError)
      return toast.error("Could not delete that photo.", {
        description: deleteError.message,
      });

    if (collection.cover_image_url === photo.image_url) {
      const remaining = (photosByCollection[collection.id] ?? []).filter(
        (p) => p.id !== photo.id,
      );
      const nextCover =
        remaining.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url ??
        null;
      await supabase
        .from("gallery_collections")
        .update({ cover_image_url: nextCover })
        .eq("id", collection.id);
    }

    let problem = "";
    if (photo.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("gallery-images")
        .remove([photo.storage_path]);
      if (storageError)
        problem = `Photo removed, but its file is still in storage: ${storageError.message}`;
    }
    await afterWrite("Photo deleted.", problem);
  }

  async function uploadPhotos(collection: GalleryCollection, files: FileList) {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
      return toast.error("Please sign in again before uploading.");

    const list = Array.from(files);
    const invalid = list.find((file) => !file.type.startsWith("image/"));
    if (invalid) return toast.error(`"${invalid.name}" is not an image.`);
    const tooLarge = list.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (tooLarge) return toast.error(`"${tooLarge.name}" is larger than 8 MB.`);

    // One toast for the whole batch rather than one per file — see
    // docs/notifications-plan.md §7.1. Resolved to success/error below,
    // bypassing afterWrite so it settles this same toast instead of leaving
    // it spinning while a second toast appears.
    const uploadToast = toast.loading(
      list.length === 1
        ? "Uploading photo..."
        : `Uploading ${list.length} photos...`,
    );

    let nextOrder = Math.max(
      0,
      ...(photosByCollection[collection.id] ?? []).map((p) => p.sort_order),
    );
    let hasCover = Boolean(collection.cover_image_url);
    let uploaded = 0;
    const failures: string[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const path = galleryStoragePath(userData.user.id, collection.slug, file);
      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        failures.push(`${file.name} (${uploadError.message})`);
        continue;
      }
      const { data } = supabase.storage
        .from("gallery-images")
        .getPublicUrl(path);
      nextOrder += 10;

      const { error: insertError } = await supabase
        .from("gallery_photos")
        .insert({
          collection_id: collection.id,
          image_url: data.publicUrl,
          storage_path: path,
          title: photoTitleFromFilename(file.name),
          sort_order: nextOrder,
        });
      if (insertError) {
        failures.push(`${file.name} (${insertError.message})`);
        continue;
      }
      uploaded += 1;

      if (!hasCover) {
        await supabase
          .from("gallery_collections")
          .update({ cover_image_url: data.publicUrl })
          .eq("id", collection.id);
        hasCover = true;
      }
    }

    // Report what actually happened, not what was attempted — a partial
    // failure here used to be overwritten by an unconditional "N uploaded"
    // before the admin could see which files didn't make it.
    const summary =
      uploaded === list.length
        ? uploaded === 1
          ? "Photo uploaded."
          : `${uploaded} photos uploaded.`
        : uploaded === 0
          ? "No photos uploaded."
          : `${uploaded} of ${list.length} uploaded.`;

    await revalidateGallery();
    if (failures.length) {
      uploadToast.error(summary, {
        description: `Failed: ${failures.join("; ")}`,
      });
    } else {
      uploadToast.success(summary);
    }
    void load();
    if (expandedId) void loadPhotos(expandedId);
  }

  /* --------------------------------------------------------------- render */

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading gallery...
      </main>
    );

  if (!email)
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );

  const ordered = [...collections].sort((a, b) => a.sort_order - b.sort_order);
  const featured = collections
    .filter((c) => c.show_on_home)
    .sort((a, b) => a.home_sort_order - b.home_sort_order);

  return (
    <AdminShell
      title="Gallery"
      description="Photo collections shown across the site."
      contentWidth="narrow"
      email={email}
    >
      <p className="max-w-2xl font-body text-sm text-[#526168]">
        Create a collection for a place — Makkah, Madinah, a hotel, a pilgrim
        group — then upload its photos. Tick &quot;Show on home&quot; for the
        collections you want featured on the home page.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <p className="mt-6 font-body text-sm text-[#526168]">
        {featured.length
          ? `${featured.length} collection${featured.length === 1 ? "" : "s"} shown on the home page.`
          : "No collections are shown on the home page yet."}
      </p>

      <div className="mt-4 space-y-4">
        {ordered.map((collection, index) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            photos={[...(photosByCollection[collection.id] ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order,
            )}
            photoCount={photoCounts[collection.id] ?? 0}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
            isExpanded={expandedId === collection.id}
            onToggleExpand={() =>
              setExpandedId(expandedId === collection.id ? null : collection.id)
            }
            homePosition={featured.findIndex((c) => c.id === collection.id)}
            homeCount={featured.length}
            onSave={saveCollection}
            onMove={moveCollection}
            onMoveHome={moveHomeCollection}
            onTogglePublished={togglePublished}
            onToggleHome={toggleShowOnHome}
            onDelete={deleteCollection}
            onUpload={uploadPhotos}
            onSavePhoto={savePhoto}
            onMovePhoto={movePhoto}
            onDeletePhoto={deletePhoto}
            onSetCover={saveCover}
          />
        ))}
        {!ordered.length && (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center font-body text-sm text-[#526168]">
            No collections yet — create your first one below.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-[#06131D]/10 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(event) => {
              setNewTitle(event.target.value);
              setAddError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addCollection();
              }
            }}
            placeholder="New collection name, e.g. Madinah — Masjid an-Nabawi"
            className="h-11 flex-1 rounded-lg border border-stone-200 px-3.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          <button
            type="button"
            onClick={() => void addCollection()}
            disabled={!newTitle.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#06131D] px-4 font-body text-sm font-bold text-[#F3E5AB] hover:bg-[#0D2A3A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiPlus /> New collection
          </button>
        </div>
        {addError && (
          <p
            role="alert"
            className="mt-2 font-body text-xs font-semibold text-red-700"
          >
            {addError}
          </p>
        )}
      </div>
    </AdminShell>
  );
}

/* ========================================================================== */
/* One collection                                                            */
/* ========================================================================== */

function CollectionCard({
  collection,
  photos,
  photoCount,
  isFirst,
  isLast,
  isExpanded,
  onToggleExpand,
  homePosition,
  homeCount,
  onSave,
  onMove,
  onMoveHome,
  onTogglePublished,
  onToggleHome,
  onDelete,
  onUpload,
  onSavePhoto,
  onMovePhoto,
  onDeletePhoto,
  onSetCover,
}: {
  collection: GalleryCollection;
  photos: GalleryPhoto[];
  /**
   * Count from gallery_collections(gallery_photos(count)) — always accurate,
   * unlike photos.length, which is 0 until the card has been expanded at
   * least once.
   */
  photoCount: number;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  homePosition: number;
  homeCount: number;
  onSave: (
    collection: GalleryCollection,
    changes: { title: string; location: string; description: string },
  ) => void;
  onMove: (collection: GalleryCollection, direction: -1 | 1) => void;
  onMoveHome: (collection: GalleryCollection, direction: -1 | 1) => void;
  onTogglePublished: (collection: GalleryCollection) => void;
  onToggleHome: (collection: GalleryCollection) => void;
  onDelete: (collection: GalleryCollection) => void;
  onUpload: (collection: GalleryCollection, files: FileList) => void;
  onSavePhoto: (
    photo: GalleryPhoto,
    changes: { title: string; caption: string },
  ) => void;
  onMovePhoto: (
    collection: GalleryCollection,
    photo: GalleryPhoto,
    direction: -1 | 1,
  ) => void;
  onDeletePhoto: (collection: GalleryCollection, photo: GalleryPhoto) => void;
  onSetCover: (collection: GalleryCollection, photo: GalleryPhoto) => void;
}) {
  const [title, setTitle] = useState(collection.title);
  const [location, setLocation] = useState(collection.location);
  const [description, setDescription] = useState(collection.description);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(collection.title);
    setLocation(collection.location);
    setDescription(collection.description);
  }, [collection.title, collection.location, collection.description]);

  const isDirty =
    title.trim() !== collection.title ||
    location.trim() !== collection.location ||
    description.trim() !== collection.description;
  const canSave = isDirty && Boolean(title.trim());

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setIsUploading(true);
    await onUpload(collection, files);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-[#06131D]/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          className="text-[#526168]"
        >
          {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
        </button>

        <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#F3EFEA]">
          {collection.cover_image_url ? (
            <Image
              src={collection.cover_image_url}
              alt={collection.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#B8C2C5]">
              <FiImage />
            </div>
          )}
        </div>

        <div className="flex flex-col" title="Order on /gallery">
          <button
            type="button"
            onClick={() => onMove(collection, -1)}
            disabled={isFirst}
            aria-label={`Move ${collection.title} up on /gallery`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronUp />
          </button>
          <button
            type="button"
            onClick={() => onMove(collection, 1)}
            disabled={isLast}
            aria-label={`Move ${collection.title} down on /gallery`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronDown />
          </button>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Collection name"
          className="h-10 min-w-[10rem] flex-1 rounded-lg border border-stone-200 bg-white px-3 font-body text-sm font-semibold outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          aria-label="Location"
          placeholder="Location, e.g. Makkah Al-Mukarramah"
          className="h-10 min-w-[10rem] flex-1 rounded-lg border border-stone-200 bg-white px-3 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />

        <span className="rounded-full bg-[#F3EFEA] px-3 py-1 font-body text-xs font-semibold text-[#526168]">
          {photoCount === 1 ? "1 photo" : `${photoCount} photos`}
        </span>

        <button
          type="button"
          onClick={() => onSave(collection, { title, location, description })}
          disabled={!canSave}
          aria-label={`Save ${collection.title}`}
          title={title.trim() ? undefined : "Give the collection a name first"}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 font-body text-xs font-bold text-[#06131D] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiSave />
        </button>

        <button
          type="button"
          onClick={() => onTogglePublished(collection)}
          aria-label={collection.is_published ? "Unpublish" : "Publish"}
          title={
            collection.is_published
              ? "Published — visible on /gallery"
              : "Hidden from the site"
          }
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${
            collection.is_published
              ? "border-emerald-200 text-emerald-600"
              : "border-stone-300 text-[#B8C2C5]"
          }`}
        >
          {collection.is_published ? <FiEye /> : <FiEyeOff />}
        </button>

        <button
          type="button"
          onClick={() => onToggleHome(collection)}
          aria-pressed={collection.show_on_home}
          title={
            collection.show_on_home
              ? "Shown on the home page"
              : "Not shown on the home page"
          }
          className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 font-body text-xs font-semibold ${
            collection.show_on_home
              ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#946E19]"
              : "border-stone-300 text-[#526168]"
          }`}
        >
          <FiHome /> {collection.show_on_home ? "On home" : "Show on home"}
        </button>

        {collection.show_on_home && homeCount > 1 && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMoveHome(collection, -1)}
              disabled={homePosition <= 0}
              aria-label={`Move ${collection.title} earlier on the home page`}
              className="text-[#997A15] disabled:opacity-25"
            >
              <FiChevronUp />
            </button>
            <button
              type="button"
              onClick={() => onMoveHome(collection, 1)}
              disabled={homePosition === homeCount - 1}
              aria-label={`Move ${collection.title} later on the home page`}
              className="text-[#997A15] disabled:opacity-25"
            >
              <FiChevronDown />
            </button>
          </div>
        )}

        {isConfirmingDelete ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDelete(collection)}
              className="inline-flex h-10 items-center rounded-lg bg-red-600 px-3 font-body text-xs font-bold text-white hover:bg-red-700"
            >
              Delete for good
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-3 font-body text-xs font-semibold text-[#526168]"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={`Delete ${collection.title}`}
            className="inline-flex h-10 items-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50"
          >
            <FiTrash2 />
          </button>
        )}
      </div>

      <div className="px-4 pb-4">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          aria-label={`Description for ${collection.title}`}
          placeholder="A short blurb shown at the top of this collection's page."
          className="w-full rounded-lg border border-stone-200 bg-[#FAF8F5] p-3 font-body text-sm leading-relaxed outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
        {/* Renaming a collection never changes its slug — a live URL should
            not break because a title changed — so the slug is shown here,
            read-only, rather than left invisible. */}
        <a
          href={`/gallery/${collection.slug}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-body text-xs text-[#526168] underline decoration-dotted hover:text-[#946E19]"
        >
          /gallery/{collection.slug}
        </a>
      </div>

      {isExpanded && (
        <div className="border-t border-stone-200 bg-[#FAF8F5] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-body text-sm font-semibold text-[#06131D]">
              Photos
            </p>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#06131D] px-3.5 py-2 font-body text-xs font-bold text-[#F3E5AB] hover:bg-[#0D2A3A]">
              <FiUpload /> {isUploading ? "Uploading..." : "Upload photos"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                onChange={(event) => void handleFiles(event.target.files)}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {photos.map((photo, index) => (
              <PhotoRow
                key={photo.id}
                photo={photo}
                isCover={collection.cover_image_url === photo.image_url}
                isFirst={index === 0}
                isLast={index === photos.length - 1}
                onSave={onSavePhoto}
                onMove={(direction) =>
                  onMovePhoto(collection, photo, direction)
                }
                onDelete={() => onDeletePhoto(collection, photo)}
                onSetCover={() => onSetCover(collection, photo)}
              />
            ))}
            {!photos.length && (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-center font-body text-sm text-[#526168]">
                No photos yet — upload some above.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* One photo                                                                 */
/* ========================================================================== */

function PhotoRow({
  photo,
  isCover,
  isFirst,
  isLast,
  onSave,
  onMove,
  onDelete,
  onSetCover,
}: {
  photo: GalleryPhoto;
  isCover: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSave: (
    photo: GalleryPhoto,
    changes: { title: string; caption: string },
  ) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onSetCover: () => void;
}) {
  const [title, setTitle] = useState(photo.title);
  const [caption, setCaption] = useState(photo.caption);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setTitle(photo.title);
    setCaption(photo.caption);
  }, [photo.title, photo.caption]);

  const isDirty =
    title.trim() !== photo.title || caption.trim() !== photo.caption;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label="Move photo up"
          className="text-[#526168] disabled:opacity-25"
        >
          <FiChevronUp />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label="Move photo down"
          className="text-[#526168] disabled:opacity-25"
        >
          <FiChevronDown />
        </button>
      </div>

      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#F3EFEA]">
        <Image
          src={photo.image_url}
          alt={photo.title || "Gallery photo"}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Photo name"
        placeholder="Photo name"
        className="h-9 min-w-[8rem] flex-1 rounded-lg border border-stone-200 px-2.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
      />
      <input
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        aria-label="Caption"
        placeholder="Caption (optional)"
        className="h-9 min-w-[10rem] flex-[1.5] rounded-lg border border-stone-200 px-2.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
      />

      <button
        type="button"
        onClick={() => onSave(photo, { title, caption })}
        disabled={!isDirty}
        aria-label="Save photo"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-2.5 font-body text-xs font-bold text-[#06131D] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiSave />
      </button>

      <button
        type="button"
        onClick={onSetCover}
        disabled={isCover}
        aria-label={isCover ? "This is the cover photo" : "Make cover photo"}
        title={isCover ? "This is the cover photo" : "Make cover photo"}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${
          isCover
            ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#946E19]"
            : "border-stone-300 text-[#526168] hover:border-[#D4AF37]"
        }`}
      >
        <FiStar />
      </button>

      {isConfirmingDelete ? (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 items-center rounded-lg bg-red-600 px-2.5 font-body text-xs font-bold text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(false)}
            className="inline-flex h-9 items-center rounded-lg border border-stone-300 px-2.5 font-body text-xs font-semibold text-[#526168]"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          aria-label="Delete photo"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-2.5 text-red-600 hover:bg-red-50"
        >
          <FiTrash2 />
        </button>
      )}
    </div>
  );
}
