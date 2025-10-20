export type SyllabusRef = "CCIM" | "NCISM" | string;

export interface Book {
  id: string;
  title: string;
  author: string;
  subject: string;
  edition: string;
  syllabus: SyllabusRef;
  fileName?: string;
  fileDataUrl?: string;
  uploaderId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Review {
  id: string;
  bookId: string;
  rating: number; // 1-5
  comment: string;
  userId?: string;
  displayName?: string;
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string; // SHA-256 hex
}

export interface Session {
  userId: string;
}
