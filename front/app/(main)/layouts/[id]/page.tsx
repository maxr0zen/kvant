import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { fetchLayoutById } from "@/lib/api/layouts";
import { fetchLectureById } from "@/lib/api/lectures";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { LayoutView } from "./layout-view";
import { PageHeader } from "@/components/ui/page-header";
import { AvailabilityCountdown } from "@/components/availability-countdown";

export default async function LayoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const layout = await fetchLayoutById(id, token);
  if (!layout) notFound();

  const resolvedLectureId = layout.attachedLectureId?.trim() || layout.attachedLecture?.id?.trim() || "";
  const initialAttachedLecture =
    layout.attachedLecture ??
    (resolvedLectureId
      ? await fetchLectureById(resolvedLectureId, null, { skipAuth: true, cache: "no-store" })
      : null);

  const breadcrumbs = layout.trackId
    ? [
        { label: "Главная", href: "/main" },
        { label: "Трек", href: `/main/${layout.trackId}` },
        { label: layout.title },
      ]
    : [{ label: "Главная", href: "/main" }, { label: layout.title }];

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        title={layout.title}
        description={layout.description || "Практический layout workspace с live-preview и проверкой результата."}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <AvailabilityCountdown availableUntil={layout.availableUntil} className="shrink-0" />
            {layout.canEdit && (
              <Link href={`/admin/layouts/${id}/edit`}>
                <Button variant="outline" size="sm">Редактировать</Button>
              </Link>
            )}
          </div>
        }
      />
      <LayoutView layout={layout} initialAttachedLecture={initialAttachedLecture} />
    </div>
  );
}
