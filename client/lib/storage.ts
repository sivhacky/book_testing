import { Book, Review, Session, User } from "./models";

const KEYS = {
  books: "medtextdb:books",
  reviews: "medtextdb:reviews",
  users: "medtextdb:users",
  session: "medtextdb:session",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function id(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Users
export function getUsers(): User[] {
  return read<User[]>(KEYS.users, []);
}
export function saveUsers(users: User[]) {
  write(KEYS.users, users);
}
export function getSession(): Session | null {
  return read<Session | null>(KEYS.session, null);
}
export function setSession(session: Session | null) {
  if (session) write(KEYS.session, session);
  else localStorage.removeItem(KEYS.session);
}
export function currentUser(): User | null {
  const s = getSession();
  if (!s) return null;
  return getUsers().find((u) => u.id === s.userId) || null;
}

// Books
export function getBooks(): Book[] {
  return read<Book[]>(KEYS.books, []);
}
export function saveBooks(books: Book[]) {
  write(KEYS.books, books);
}
export function upsertBook(book: Book) {
  const books = getBooks();
  const idx = books.findIndex((b) => b.id === book.id);
  if (idx >= 0) books[idx] = book;
  else books.unshift(book);
  saveBooks(books);
}
export function deleteBook(bookId: string) {
  const books = getBooks().filter((b) => b.id !== bookId);
  saveBooks(books);
  const reviews = getReviews().filter((r) => r.bookId !== bookId);
  saveReviews(reviews);
}

// Reviews
export function getReviews(): Review[] {
  return read<Review[]>(KEYS.reviews, []);
}
export function saveReviews(reviews: Review[]) {
  write(KEYS.reviews, reviews);
}
export function reviewsForBook(bookId: string): Review[] {
  return getReviews().filter((r) => r.bookId === bookId);
}
export function averageRating(bookId: string): number {
  const rs = reviewsForBook(bookId);
  if (!rs.length) return 0;
  const sum = rs.reduce((a, r) => a + (r.rating || 0), 0);
  return Math.round((sum / rs.length) * 10) / 10;
}

export function seedIfEmpty() {
  if (getBooks().length) return;
  const now = Date.now();
  const txt = (t: string) => 'data:text/plain;charset=utf-8;base64,' + btoa(t);
  const sample: Book[] = [
    {
      id: id(),
      title: "Robbins & Cotran Pathologic Basis of Disease",
      author: "Kumar, Abbas, Aster",
      subject: "Pathology",
      edition: "10th",
      syllabus: "NCISM",
      fileName: "Robbins-demo.txt",
      fileDataUrl: txt("Demo file for local testing. Not the actual textbook."),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id(),
      title: "Harrison's Principles of Internal Medicine",
      author: "J. Larry Jameson et al.",
      subject: "Internal Medicine",
      edition: "21st",
      syllabus: "NCISM",
      fileName: "Harrisons-demo.txt",
      fileDataUrl: txt("Demo file for local testing. Not the actual textbook."),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id(),
      title: "Gray's Anatomy for Students",
      author: "Richard L. Drake",
      subject: "Anatomy",
      edition: "4th",
      syllabus: "CCIM",
      fileName: "Grays-demo.txt",
      fileDataUrl: txt("Demo file for local testing. Not the actual textbook."),
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveBooks(sample);
}
