# Lucia Auth

1. To initialize prisma with SQLite:

```sh
npm i prisma -D
npm i @pisma/client
npx prisma init --datasource-provider sqlite
```

===========
Google Oauth
===========

1. Install arctic to create Google Oauth Client:

```sh
npm i arctic
```

2. Create ui for google login

3. Create a project in google cloud console(consent screen and credentials)
4. Create route for google callback
5. Create env variables
6. Creal Google Oauth Client using arctic and env variables in lib "googleOauth.ts":

```ts
import { Google } from "arctic";

export const googleOauthClient = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.NEXT_PUBLIC_URL + "/api/auth/google/callback"
);
```

7. Create a getGoogleOauthConsentUrl:

```ts
export const getGoogleOauthConsentUrl = async () => {
  try {
    // generate state with arctic
    const state = generateState();

    const codeVerifier = generateCodeVerifier();

    cookies().set("code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    cookies().set("state", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    const authUrl = await googleOauthClient.createAuthorizationURL(
      state,
      codeVerifier,
      {
        // what to get from user
        scopes: ["email", "profile"],
      }
    );

    return { success: true, url: authUrl };
  } catch (error) {
    return { success: false, error: `Something went wrong: ${error}` };
  }
};
```

8. Create a route:

```ts
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
```

Done.
