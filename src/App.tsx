import React from "react";
import { Toaster } from "sonner";
import IndexPage from "./pages/Index";

export default function App() {
  return (
    <>
      <IndexPage />
      <Toaster position="top-right" richColors closeButton expand />
    </>
  );
}
