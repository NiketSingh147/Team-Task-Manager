import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return err("Validation failed", 400, e.flatten());
  }
  if (e instanceof AuthError) {
    return err(e.message, e.status);
  }
  if (e instanceof Error) {
    console.error(e);
    return err(e.message || "Internal server error", 500);
  }
  console.error(e);
  return err("Internal server error", 500);
}
