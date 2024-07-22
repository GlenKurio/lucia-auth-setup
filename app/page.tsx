import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-24 gap-8">
      <h1 className="text-3xl font-bold">Lucia Auth Tutorial</h1>
      <Button>Authenticate</Button>
    </main>
  );
}
