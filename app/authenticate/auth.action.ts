"use server";

import { signUpSchema } from "@/components/sign-up-form";
import { db } from "@/lib/db";
import { z } from "zod";
import { Argon2id } from "oslo/password";
import { lucia } from "@/lib/lucia";
import { cookies } from "next/headers";
import { signInSchema } from "@/components/sign-in-form";
import { redirect } from "next/navigation";
export async function signUp(values: z.infer<typeof signUpSchema>) {
  // TODO: Should i use safeParse here?
  console.log("sign up values: ", values);
  try {
    const existingUser = await db.user.findUnique({
      where: {
        email: values.email,
      },
    });

    if (existingUser) {
      return {
        success: false,
        error: "User already exists",
      };
    }
    // remember to make changes to next config file for this to work properly
    const hashedPassword = await new Argon2id().hash(values.password);

    const user = await db.user.create({
      data: {
        name: values.name,
        email: values.email.toLowerCase(),
        hashedPassword,
      },
    });

    // create lucia globally
    const session = await lucia.createSession(user.id, {});

    const sessionCookie = await lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export const signIn = async (values: z.infer<typeof signInSchema>) => {
  try {
    const user = await db.user.findUnique({
      where: {
        email: values.email,
      },
    });
    if (!user || !user.hashedPassword) {
      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    const passwordMatches = await new Argon2id().verify(
      user.hashedPassword,
      values.password
    );
    if (!passwordMatches) {
      return {
        success: false,
        error: "Invalid credentials",
      };
    }
    // successfully logged in
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = await lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Something went wrong: ${error}`,
    };
  }
};

export const getUser = async () => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value || null;

  if (!sessionId) {
    return null;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  console.log("SESSION ID: ", sessionId);
  console.log("USER: ", user);

  try {
    if (session && session.fresh) {
      // refresh session
      const sessionCookie = await lucia.createSessionCookie(session.id);
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }

    if (!session) {
      const sessionCookie = await lucia.createBlankSessionCookie();
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
  } catch (error) {}

  const dbUser = await db.user.findUnique({
    where: {
      id: user?.id,
    },
    select: {
      name: true,
      email: true,
    },
  });
  return dbUser;
};

export const logOut = async () => {
  const sessionCookie = await lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return redirect("/authenticate");
};
