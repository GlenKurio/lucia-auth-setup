import { Lucia } from "lucia";
// install prisma adapter
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { db } from "./db";
// initialize prisma adapter with session and user tables
const adapter = new PrismaAdapter(db.session, db.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "singapore-auth-cookie",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
});
