import { CommunityGallerySection } from "@/components/dashboard/community-gallery";
import { listCommunityGenerations } from "@/lib/community-gallery";

export default async function CommunityGalleryPage() {
  const items = await listCommunityGenerations(48);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
            Community
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Хэрэглэгчдийн бүтээсэн зургуудыг нэг дороос хар.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            Pinterest маягийн урсгалаар сүүлийн бүтээлүүдийг үзэж, дурын зураг дээр дарж
            prompt, үүсгэсэн хэрэглэгч, ашигласан загварын мэдээлэл рүү орно.
          </p>
        </div>
      </section>

      <CommunityGallerySection
        items={items}
        title="Нээлттэй зургийн урсгал"
        description="Сүүлийн үеийн бүтээлүүдийг үзэж санаа аваарай. Зураг дээр дармагц detail page нээгдэнэ."
        emptyMessage="Одоогоор харах community зураг алга байна."
      />
    </div>
  );
}
