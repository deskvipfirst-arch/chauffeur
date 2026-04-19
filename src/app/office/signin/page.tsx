import { redirect } from "next/navigation";

export default function OfficeSignInRedirectPage() {
  redirect("/administrator/signin");
}
