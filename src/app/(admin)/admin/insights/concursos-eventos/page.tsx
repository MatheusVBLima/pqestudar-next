import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/insights/concursos?tab=eventos");
}
