"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiArrowRight, FiChevronLeft, FiChevronRight, FiMapPin, FiX } from "react-icons/fi";
import type { GalleryCollectionWithPhotos } from "@/lib/gallery";

const SWIPE_THRESHOLD_PX = 50;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Sets `inert` on every element outside `node`'s path to the document root, so
 * a keyboard user tabbing past the lightbox's own controls cannot reach the
 * scroll-locked page behind it. Returns a cleanup that undoes exactly what it
 * set.
 */
function inertEverythingExcept(node: HTMLElement): () => void {
  const inerted: HTMLElement[] = [];
  let current: HTMLElement | null = node;

  while (current && current !== document.body) {
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (
          sibling !== current &&
          sibling instanceof HTMLElement &&
          !sibling.hasAttribute("inert")
        ) {
          sibling.setAttribute("inert", "");
          inerted.push(sibling);
        }
      }
    }
    current = parent;
  }

  return () => {
    for (const el of inerted) el.removeAttribute("inert");
  };
}

/** Cycles Tab/Shift+Tab between the first and last focusable element in `container`. */
function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function CollectionGallery({
  collection,
}: {
  collection: GalleryCollectionWithPhotos;
}) {
  const photos = collection.photos;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const isLightboxOpen = selectedIndex !== null;
  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  function showNext() {
    setSelectedIndex((current) =>
      current === null ? null : (current + 1) % photos.length,
    );
  }

  function showPrev() {
    setSelectedIndex((current) =>
      current === null ? null : (current - 1 + photos.length) % photos.length,
    );
  }

  // Kept current every render so the keydown listener below always calls the
  // latest showNext/showPrev without needing them in the effect's dependency
  // array — the effect intentionally only reruns on open/close (see the
  // dependency array), not on every step through the collection.
  const showNextRef = useRef(showNext);
  const showPrevRef = useRef(showPrev);
  showNextRef.current = showNext;
  showPrevRef.current = showPrev;

  // Escape closes, arrow keys move through the collection, Tab is trapped
  // inside the dialog, the rest of the page is inert while it's open, and
  // focus moves into the lightbox on open and returns to the tile that opened
  // it on close.
  useEffect(() => {
    if (!isLightboxOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    const restoreInert = dialogRef.current
      ? inertEverythingExcept(dialogRef.current)
      : () => {};

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowRight") showNextRef.current();
      if (event.key === "ArrowLeft") showPrevRef.current();
      if (event.key === "Tab") trapFocus(event, dialogRef.current);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      restoreInert();
      lastFocusedRef.current?.focus();
    };
  }, [isLightboxOpen]);

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD_PX) showPrev();
    else if (delta < -SWIPE_THRESHOLD_PX) showNext();
    touchStartX.current = null;
  }

  return (
    <>
      {/* Cover banner */}
      <div className="relative h-[46vh] min-h-[320px] w-full sm:h-[52vh]">
        {collection.cover_image_url ? (
          <Image
            src={collection.cover_image_url}
            alt={collection.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[#06131D]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/50 to-[#06131D]/20" />

        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Link
              href="/gallery"
              className="mb-4 inline-flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wider text-[#F3E5AB] transition hover:text-white"
            >
              <FiArrowLeft /> All collections
            </Link>
            {collection.location && (
              <p className="mb-1 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wider text-[#F3E5AB]">
                <FiMapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>{collection.location}</span>
              </p>
            )}
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-stone-300 sm:text-base">
                {collection.description}
              </p>
            )}
            <p className="mt-2 font-body text-xs text-stone-400">
              {photos.length === 1 ? "1 photo" : `${photos.length} photos`}
            </p>
          </div>
        </div>
      </div>

      {/* Masonry */}
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {photos.length ? (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
              {photos.map((photo, index) => (
                <motion.button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`View ${photo.title || collection.title}`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05 }}
                  className="group relative mb-5 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-stone-200 shadow-sm transition-all duration-300 hover:border-[#D4AF37]/60 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
                >
                  <Image
                    src={photo.image_url}
                    alt={photo.title || collection.title}
                    width={800}
                    height={600}
                    sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {photo.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06131D]/85 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="font-body text-xs font-semibold text-white">
                        {photo.title}
                      </p>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#D4AF37]/40 bg-white/50 p-10 text-center font-body text-sm text-[#526168]">
              Photos for this collection are being added — check back soon.
            </p>
          )}

          <div className="mt-14 text-center">
            <Link
              href="/#contact"
              className="gold-gradient-bg inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold text-[#06131D] shadow-lg shadow-[#D4AF37]/20 transition-all hover:brightness-110 sm:text-sm"
            >
              <span>Plan a journey like this</span>
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selected && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setSelectedIndex(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label={selected.title || collection.title}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:text-[#D4AF37] sm:left-6"
          >
            <FiChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:text-[#D4AF37] sm:right-6"
          >
            <FiChevronRight className="h-6 w-6" />
          </button>

          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-[#06131D] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setSelectedIndex(null)}
              aria-label="Close image"
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2.5 text-white transition-colors hover:text-[#D4AF37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            >
              <FiX className="h-6 w-6" />
            </button>

            <div className="relative h-[420px] w-full sm:h-[550px]">
              <Image
                src={selected.image_url}
                alt={selected.title || collection.title}
                fill
                sizes="(min-width: 1024px) 56rem, 100vw"
                className="object-contain"
              />
            </div>

            <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 bg-[#0B1E28] p-6 sm:flex-row sm:items-center">
              <div>
                <span className="font-body text-xs font-semibold uppercase tracking-wider text-[#F3E5AB]">
                  {collection.title}
                </span>
                {selected.title && (
                  <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                    {selected.title}
                  </h3>
                )}
                {selected.caption && (
                  <p className="mt-0.5 text-sm text-stone-300">{selected.caption}</p>
                )}
                <p className="mt-1 font-body text-xs text-stone-400">
                  {selectedIndex !== null ? selectedIndex + 1 : 0} / {photos.length}
                </p>
              </div>

              <Link
                href="/#contact"
                onClick={() => setSelectedIndex(null)}
                className="gold-gradient-bg whitespace-nowrap rounded-xl px-6 py-2.5 text-xs font-bold text-[#06131D] shadow-md transition hover:brightness-110 sm:text-sm"
              >
                Plan Your Journey
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
