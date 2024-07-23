# Lucia Auth

1. To initialize prisma with SQLite:

```sh
npm i prisma -D
npm i @pisma/client
npx prisma init --datasource-provider sqlite
```

===========
Lucia Credentials Auth
===========

1. Initialize Prisma and define models:

```prisma


generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String
  role           String? // no enums in SQLite
  hashedPassword String?
  Session        Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime

  user User @relation(fields: [userId], references: [id])
}

```

2. Create global db instance
3. Create signUp function in auth actions with oslo for password ashing

```sh
npm i oslo
```

<!-- Add this to next.config for oslo to work properly -->

```ts
// next.config.ts
const nextConfig = {
  webpack: (config) => {
    config.externals.push("@node-rs/argon2", "@node-rs/bcrypt");
    return config;
  },
};
```

```ts
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
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

4. Create global lucia object to be able to create sessions, with prisma adaptrer (or any other db adapter) to allow lucia read and write session and user from/to db:

```ts
import { Lucia } from "lucia";
// install prisma adapter
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { db } from "./db";
// initialize prisma adapter with session and user tables
const adapter = new PrismaAdapter(db.session, db.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "singapore-auth-cookie",
    expires: false, // might be not the best idea
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
});
```

5. Create session in signUp action:

```ts
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

    // CREATE SESSION WITH LUCIA
    // create session with our global lucia
    const session = await lucia.createSession(user.id, {});
    // create session cookie
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

=============
Questions
=============

- How to make lucia work with next middleware ?
- How to merge accounts ?
- How to fix ts error with URL type in google oauth btn ?
- Is google oauth link needs to be updated manually ? How often do they change it ?
- How to make magic-link sign-in ?
