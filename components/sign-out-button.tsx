"use client";
import React from "react";
import { Button } from "./ui/button";
import { logOut } from "@/app/authenticate/auth.action";

export default function SignOutButton() {
  return <Button onClick={async () => await logOut()}>SignOutButton</Button>;
}
