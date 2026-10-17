import { redirect } from "next/navigation";

// Como o protótipo SA0: o painel abre em Contas.
export default function AdminIndex() {
  redirect("/admin/contas");
}
