import { redirect } from "next/navigation";

export default function AdminGenerationsRedirect() {
  redirect("/admin/question-generator");
}
