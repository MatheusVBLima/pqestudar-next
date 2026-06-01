import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/insights/auditorias?tab=seo");
}
