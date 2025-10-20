import { Book, Review } from "@/lib/models";
import { averageRating, reviewsForBook } from "@/lib/storage";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  book: Book;
  canModify: boolean;
  onSubmitReview: (rating: number, comment: string, displayName?: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function BookCard({ book, canModify, onSubmitReview, onDelete, onEdit }: Props) {
  const [openReview, setOpenReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");

  const reviews = useMemo<Review[]>(() => reviewsForBook(book.id), [book.id]);
  const avg = useMemo<number>(() => averageRating(book.id), [book.id, reviews.length]);

  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{book.title}</h3>
          <p className="text-sm text-muted-foreground">{book.author} • {book.subject} • {book.edition} • Syllabus: {book.syllabus}</p>
          {book.fileName ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Attachment: {" "}
              <a className="underline hover:text-foreground" href={book.fileDataUrl} download={book.fileName}>
                {book.fileName}
              </a>
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <StarRating value={avg} readOnly className="opacity-90" />
            <span className="text-sm text-muted-foreground">{avg ? avg.toFixed(1) : "0.0"}</span>
          </div>
          <p className="text-xs text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {book.fileDataUrl && (
          <Button size="sm" asChild>
            <a href={book.fileDataUrl} download={book.fileName || `${book.title}.file`} aria-label={`Download ${book.title}`}>
              Download
            </a>
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setOpenReview((v) => !v)}>
          {openReview ? "Close" : "Rate & Comment"}
        </Button>
        {canModify && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
          </>
        )}
      </div>

      {openReview && (
        <div className="mt-4 rounded-md border border-border/60 bg-background p-3">
          <label className="text-sm text-muted-foreground">Your rating</label>
          <StarRating value={rating} onChange={setRating} size={20} className="mt-1" />

          <div className="mt-3 grid gap-2">
            <label className="text-sm text-muted-foreground" htmlFor={`name-${book.id}`}>Display name (optional)</label>
            <Input id={`name-${book.id}`} placeholder="Anonymous" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="mt-3 grid gap-2">
            <label className="text-sm text-muted-foreground" htmlFor={`c-${book.id}`}>Comment</label>
            <Textarea id={`c-${book.id}`} placeholder="Share your thoughts..." value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setComment(""); setDisplayName(""); setRating(5); }}>Clear</Button>
            <Button size="sm" onClick={() => { if (!comment.trim()) return; onSubmitReview(rating, comment.trim(), displayName.trim() || undefined); setOpenReview(false); setComment(""); }}>
              Submit
            </Button>
          </div>

          {reviews.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium">Recent reviews</p>
              <ul className="mt-2 space-y-3">
                {reviews.slice(0, 3).map((r) => (
                  <li key={r.id} className="rounded border border-border/60 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()} • {r.displayName || "Anonymous"}</span>
                      <StarRating value={r.rating} readOnly />
                    </div>
                    <p className="mt-1 text-sm">{r.comment}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
