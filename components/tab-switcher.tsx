"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  SignUpTab: React.ReactNode;
  SignInTab: React.ReactNode;
};
export default function TabSwitcher(props: Props) {
  return (
    <Tabs defaultValue="sign-in" className="w-[400px]">
      <TabsList className="w-full">
        <TabsTrigger className="w-full" value="sign-in">
          Signin
        </TabsTrigger>
        <TabsTrigger className="w-full" value="sign-up">
          Signup
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in">{props.SignInTab}</TabsContent>
      <TabsContent value="sign-up">{props.SignUpTab}</TabsContent>
    </Tabs>
  );
}
