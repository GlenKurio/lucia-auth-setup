import React from "react";
import { getUser } from "../authenticate/auth.action";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/sign-out-button";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect("/authenticate");
  }
  return (
    <>
      <div>
        You are logged in as {user.email}, {user.name}
      </div>
      <SignOutButton />
    </>
  );
}
