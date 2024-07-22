import { db } from "@/lib/db";
import { googleOauthClient } from "@/lib/google-oauth";
import { lucia } from "@/lib/lucia";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
  const url = req.nextUrl;
  // check for code and state in URL from google
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    console.error("Missing code or state");
    return new Response("Missing code or state", { status: 400 });
  }
  // Get code verifier and state from cookies
  const codeVerifier = cookies().get("code_verifier")?.value;
  const savedState = cookies().get("state")?.value;

  if (!codeVerifier || !savedState) {
    console.error("Missing code verifier or state");
    return new Response("Missing code verifier or state", { status: 400 });
  }
  // compare state and code verifier
  if (state !== savedState) {
    console.error("State mismatch");
    return new Response("State mismatch", { status: 400 });
  }
  // get access token from google using our google oauth client
  const { accessToken } = await googleOauthClient.validateAuthorizationCode(
    code,
    codeVerifier
  );

  const googleResponse = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const googleData = (await googleResponse.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
  let userId: string = "";
  // if email exists in db , create cookie and sign in

  // if email does not exist in db , create user in db and create cookie and sign in

  const existingUser = await db.user.findUnique({
    where: {
      email: googleData.email,
    },
  });

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const user = await db.user.create({
      data: {
        // can add picture from google
        name: googleData.name,
        email: googleData.email,
      },
    });
    userId = user.id;
  }

  const session = await lucia.createSession(userId, {});
  const sessionCookie = await lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect("/dashboard");
}
