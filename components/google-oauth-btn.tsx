"use client";
import React from "react";
import { Button } from "./ui/button";
import { BiLogoGoogle } from "react-icons/bi";
import { getGoogleOauthConsentUrl } from "@/app/authenticate/auth.action";
import { toast } from "sonner";
export default function GoogleOauthButton() {
  return (
    <Button
      onClick={async () => {
        const res = await getGoogleOauthConsentUrl();

        if (res.url) {
          // TODO: fix this ts issue
          // @ts-ignore
          window.location.href = res.url;
        } else {
          toast.error(res.error);
        }
      }}
    >
      <BiLogoGoogle className="w-5 h-5 mr-2" /> Continue with Google
    </Button>
  );
}
