import { redirect } from "next/navigation";

/** PR-Erstellung erfolgt ueber den Drawer auf der PR-Liste. */
export default function NewPullRequestPage() {
  redirect("/pull-requests");
}
