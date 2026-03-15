import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { toRouteRoleSegment } from "@/lib/role-route";

export default async function SignInPage() {
  const { userId, sessionClaims } = await auth();

  if (userId) {
    const metadata = (sessionClaims?.metadata as Record<string, string>) ?? {};
    const role = toRouteRoleSegment(metadata.role);
    const department = metadata.department;

    if (role && department) {
      redirect(`/dashboard/${department}/${role}`);
    }

    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <SignIn />
    </div>
  );
}
