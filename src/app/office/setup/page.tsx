import { redirect } from "next/navigation";

export default function OfficeSetupRedirectPage() {
  redirect("/administrator/setup");
}
