import { NextResponse } from "next/server";

export function jsonUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function jsonForbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
