import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import TabSwitcher from "@/components/tab-switcher";
import React from "react";
import { getUser } from "./auth.action";
import { redirect } from "next/navigation";
import GoogleOauthButton from "@/components/google-oauth-btn";

export default async function AuthenticatePage() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }
  return (
    <div className=" flex w-full h-screen bg-background items-center justify-center">
      <div className="max-w-3xl w-full h-full  flex flex-col gap-4 items-center justify-center">
        <GoogleOauthButton />
        <TabSwitcher SignInTab={<SignInForm />} SignUpTab={<SignUpForm />} />
      </div>
    </div>
  );
}
