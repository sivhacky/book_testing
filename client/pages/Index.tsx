import { useEffect, useMemo, useState } from "react";
import { Book, Review, User } from "@/lib/models";
import {
  averageRating,
  currentUser,
  deleteBook,
  getBooks,
  getReviews,
  getUsers,
  id,
  reviewsForBook,
  saveBooks,
  saveReviews,
  saveUsers,
  seedIfEmpty,
  setSession,
  upsertBook,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCard } from "@/components/BookCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Index() {
  const [q, setQ] = useState("");
  const [syllabus, setSyllabus] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const me = currentUser();

  const [books, setBooks] = useState<Book[]>([]);
  const [reviews, setAllReviews] = useState<Review[]>([]);

  // upload form state
  const [form, setForm] = useState({
    title: "",
    author: "",
    subject: "",
    edition: "",
    syllabus: "NCISM",
    fileName: "" as string | undefined,
    fileDataUrl: undefined as string | undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    seedIfEmpty();
    setBooks(getBooks());
    setAllReviews(getReviews());
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return books.filter((b) => {
      const matchesQ = !ql || [b.title, b.author, b.subject].some((v) => v.toLowerCase().includes(ql));
      const matchesS = !syllabus || b.syllabus.toLowerCase() === syllabus.toLowerCase();
      const matchesSub = !subject || b.subject.toLowerCase().includes(subject.toLowerCase());
      return matchesQ && matchesS && matchesSub;
    });
  }, [books, q, syllabus, subject]);

  function handleAddReview(book: Book, rating: number, comment: string, displayName?: string) {
    const r: Review = {
      id: id(),
      bookId: book.id,
      rating,
      comment,
      userId: me?.id,
      displayName: displayName || (me?.displayName ?? undefined),
      createdAt: Date.now(),
    };
    const next = [r, ...getReviews()];
    saveReviews(next);
    setAllReviews(next);
  }

  function handleDelete(book: Book) {
    if (!me || me.id !== book.uploaderId) return;
    if (!confirm("Delete this book and its reviews?")) return;
    deleteBook(book.id);
    setBooks(getBooks());
    setAllReviews(getReviews());
  }

  function validateUpload() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.author.trim()) e.author = "Required";
    if (!form.subject.trim()) e.subject = "Required";
    if (!form.edition.trim()) e.edition = "Required";
    if (!form.syllabus.trim()) e.syllabus = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onFileChange(file: File | null) {
    if (!file) {
      setForm((f) => ({ ...f, fileName: undefined, fileDataUrl: undefined }));
      return;
    }
    if (!/(pdf|txt)$/i.test(file.name)) {
      alert("Only PDF or TXT files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("File too large (max 2MB for demo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, fileName: file.name, fileDataUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function resetUploadForm() {
    setForm({ title: "", author: "", subject: "", edition: "", syllabus: "NCISM", fileName: undefined, fileDataUrl: undefined });
    setErrors({});
  }

  function submitUpload() {
    if (!me) {
      alert("Please login to upload");
      return;
    }
    if (!validateUpload()) return;
    const now = Date.now();
    const book: Book = {
      id: id(),
      title: form.title.trim(),
      author: form.author.trim(),
      subject: form.subject.trim(),
      edition: form.edition.trim(),
      syllabus: form.syllabus.trim(),
      fileName: form.fileName,
      fileDataUrl: form.fileDataUrl,
      uploaderId: me.id,
      createdAt: now,
      updatedAt: now,
    };
    upsertBook(book);
    setBooks(getBooks());
    resetUploadForm();
  }

  function openEdit(b: Book) {
    setEditing(b);
    setEditForm({ title: b.title, author: b.author, subject: b.subject, edition: b.edition, syllabus: String(b.syllabus) });
    setEditErrors({});
  }

  function validateEdit() {
    const e: Record<string, string> = {};
    if (!editForm.title.trim()) e.title = "Required";
    if (!editForm.author.trim()) e.author = "Required";
    if (!editForm.subject.trim()) e.subject = "Required";
    if (!editForm.edition.trim()) e.edition = "Required";
    if (!editForm.syllabus.trim()) e.syllabus = "Required";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  }

  function submitEdit() {
    if (!editing) return;
    if (!me || me.id !== editing.uploaderId) {
      alert("Only the uploader can edit this book");
      return;
    }
    if (!validateEdit()) return;
    const updated: Book = {
      ...editing,
      title: editForm.title.trim(),
      author: editForm.author.trim(),
      subject: editForm.subject.trim(),
      edition: editForm.edition.trim(),
      syllabus: editForm.syllabus.trim(),
      updatedAt: Date.now(),
    };
    upsertBook(updated);
    setBooks(getBooks());
    setEditing(null);
  }

  const subjects = useMemo(() => {
    const s = new Set(books.map((b) => b.subject));
    return Array.from(s).sort();
  }, [books.length]);

  // login/register dialog state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [auth, setAuth] = useState({ username: "", password: "", displayName: "" });
  const [authError, setAuthError] = useState<string>("");

  // edit state
  const [editing, setEditing] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    subject: "",
    edition: "",
    syllabus: "NCISM",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  async function onAuthSubmit() {
    setAuthError("");
    if (authMode === "register") {
      if (!auth.username.trim() || !auth.password.trim() || !auth.displayName.trim()) {
        setAuthError("All fields are required");
        return;
      }
      const existing = getUsers();
      if (existing.find((u) => u.username.toLowerCase() === auth.username.toLowerCase())) {
        setAuthError("Username already exists");
        return;
      }
      const user: User = {
        id: id(),
        username: auth.username.trim(),
        displayName: auth.displayName.trim(),
        passwordHash: await hashPassword(auth.password),
      };
      saveUsers([user, ...existing]);
      setSession({ userId: user.id });
      setAuthOpen(false);
    } else {
      if (!auth.username.trim() || !auth.password.trim()) {
        setAuthError("Username and password required");
        return;
      }
      const user = getUsers().find((u) => u.username.toLowerCase() === auth.username.toLowerCase());
      if (!user) {
        setAuthError("Invalid credentials");
        return;
      }
      const hash = await hashPassword(auth.password);
      if (user.passwordHash !== hash) {
        setAuthError("Invalid credentials");
        return;
      }
      setSession({ userId: user.id });
      setAuthOpen(false);
    }
    // refresh derived state
    setTimeout(() => {
      setAuth({ username: "", password: "", displayName: "" });
    }, 0);
  }

  function logout() {
    setSession(null);
    setAuth({ username: "", password: "", displayName: "" });
  }

  return (
    <div className="min-h-screen terminal-grid">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_theme(colors.primary.DEFAULT)]"></span>
            <span className="font-bold tracking-tight glow">MedTextDB</span>
            <span className="text-xs text-muted-foreground hidden sm:block">local demo</span>
          </a>
          <nav className="flex items-center gap-2">
            <a className="text-sm text-muted-foreground hover:text-foreground px-2 py-1" href="#search">Search</a>
            <a className="text-sm text-muted-foreground hover:text-foreground px-2 py-1" href="#books">Books</a>
            <button className="text-sm text-muted-foreground hover:text-foreground px-2 py-1" onClick={() => setAuthOpen(true)}>{me ? `Logout (${me.displayName})` : "Login / Register"}</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-20">
        <section id="hero" className="py-10 sm:py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Medical textbooks, reviews, and ratings.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Browse, search, rate, and comment on textbooks. Upload your own when signed in. All data is stored locally in your browser for demonstration.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#upload"><Button>Upload a Book</Button></a>
              <a href="#books"><Button variant="secondary">View Books</Button></a>
            </div>
          </div>
        </section>

        <section id="search" className="mt-4 rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="q">Search by Title, Author, or Subject</Label>
              <Input id="q" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="syll">Syllabus</Label>
              <select id="syll" className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={syllabus} onChange={(e) => setSyllabus(e.target.value)}>
                <option value="">All</option>
                <option value="CCIM">CCIM</option>
                <option value="NCISM">NCISM</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <Label htmlFor="subject">Filter by Subject</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setSubject("")} className={`rounded-full border px-3 py-1 text-xs ${subject === "" ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-muted"}`}>All</button>
              {subjects.map((s) => (
                <button key={s} onClick={() => setSubject(s)} className={"rounded-full border px-3 py-1 text-xs " + (subject === s ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-muted")}>{s}</button>
              ))}
            </div>
          </div>
        </section>

        <section id="upload" className="mt-8 rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upload a Book</h2>
            {!me && <span className="text-sm text-muted-foreground">Login required</span>}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label>Book Name</Label>
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
            </div>
            <div>
              <Label>Author</Label>
              <Input placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              {errors.author && <p className="mt-1 text-xs text-destructive">{errors.author}</p>}
            </div>
            <div>
              <Label>Subject</Label>
              <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              {errors.subject && <p className="mt-1 text-xs text-destructive">{errors.subject}</p>}
            </div>
            <div>
              <Label>Edition</Label>
              <Input placeholder="Edition" value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} />
              {errors.edition && <p className="mt-1 text-xs text-destructive">{errors.edition}</p>}
            </div>
            <div>
              <Label>Syllabus Reference (CCIM/NCISM)</Label>
              <select className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.syllabus} onChange={(e) => setForm({ ...form, syllabus: e.target.value })}>
                <option value="NCISM">NCISM</option>
                <option value="CCIM">CCIM</option>
              </select>
              {errors.syllabus && <p className="mt-1 text-xs text-destructive">{errors.syllabus}</p>}
            </div>
            <div>
              <Label>Attachment (PDF or TXT, optional)</Label>
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="mt-2 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-foreground hover:file:opacity-90"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              {form.fileName && <p className="mt-1 text-xs text-muted-foreground">Selected: {form.fileName}</p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={resetUploadForm}>Reset</Button>
            <Button onClick={submitUpload} disabled={!me}>Submit</Button>
          </div>
        </section>

        <section id="books" className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Books</h2>
            <span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                canModify={!!me && me.id === b.uploaderId}
                onDelete={() => handleDelete(b)}
                onEdit={() => openEdit(b)}
                onSubmitReview={(rating, comment, displayName) => handleAddReview(b, rating, comment, displayName)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">No books match your filters.</div>
            )}
          </div>
        </section>
      </main>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{authMode === "login" ? "Login" : "Register"}</DialogTitle>
            <DialogDescription>Local-only authentication for demo purposes. Credentials are stored securely in your browser.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Username</Label>
              <Input value={auth.username} onChange={(e) => setAuth({ ...auth, username: e.target.value })} />
            </div>
            {authMode === "register" && (
              <div>
                <Label>Display Name</Label>
                <Input value={auth.displayName} onChange={(e) => setAuth({ ...auth, displayName: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Password</Label>
              <Input type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
            </div>
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-2">
                <Button onClick={onAuthSubmit}>{authMode === "login" ? "Login" : "Create Account"}</Button>
                {me && <Button variant="secondary" onClick={logout}>Logout</Button>}
              </div>
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Need an account? Register" : "Have an account? Login"}</button>
            </div>
          </div>
        </DialogContent>
        <DialogTrigger asChild>
          <span></span>
        </DialogTrigger>
      </Dialog>

      {/* Edit book dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Update metadata for your uploaded book.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Book Name</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                {editErrors.title && <p className="mt-1 text-xs text-destructive">{editErrors.title}</p>}
              </div>
              <div>
                <Label>Author</Label>
                <Input value={editForm.author} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} />
                {editErrors.author && <p className="mt-1 text-xs text-destructive">{editErrors.author}</p>}
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
                {editErrors.subject && <p className="mt-1 text-xs text-destructive">{editErrors.subject}</p>}
              </div>
              <div>
                <Label>Edition</Label>
                <Input value={editForm.edition} onChange={(e) => setEditForm({ ...editForm, edition: e.target.value })} />
                {editErrors.edition && <p className="mt-1 text-xs text-destructive">{editErrors.edition}</p>}
              </div>
              <div>
                <Label>Syllabus Reference</Label>
                <select className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.syllabus} onChange={(e) => setEditForm({ ...editForm, syllabus: e.target.value })}>
                  <option value="NCISM">NCISM</option>
                  <option value="CCIM">CCIM</option>
                </select>
                {editErrors.syllabus && <p className="mt-1 text-xs text-destructive">{editErrors.syllabus}</p>}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={submitEdit}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogTrigger asChild>
          <span></span>
        </DialogTrigger>
      </Dialog>

      <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground">
        <div className="container mx-auto">
          <p>Built for local demonstration. Data never leaves your browser.</p>
        </div>
      </footer>
    </div>
  );
}
