import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            Postly контент студи
          </h1>
          <p className="mt-3 text-base text-slate-700">
            NanoBanana ашиглан зураг үүсгэж, кредитээр тооцоо хийдэг платформ.
            Энгийн хэрэглэгчээр шууд эхлэх эсвэл агент эрх авч 150,000₮-ийн
            төлбөрөө баталгаажуулж ажиллана.
          </p>
        </div>

        <AuthForm />
      </div>
    </main>
  );
}
