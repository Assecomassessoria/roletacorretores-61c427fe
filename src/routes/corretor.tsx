import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/corretor")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
