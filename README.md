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
