import { redirect } from "next/navigation";

export default function AdminSignInRedirectPage() {
  redirect("/administrator/signin");
}
