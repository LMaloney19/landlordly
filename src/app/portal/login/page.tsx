import { redirect } from "next/navigation";

export default function PortalLoginPage() {
  redirect("/login?redirect=%2Fportal");
}
