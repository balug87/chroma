import { createFileRoute } from "@tanstack/react-router";
import { ChromaApp } from "@/components/chroma/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ChromaApp />;
}
