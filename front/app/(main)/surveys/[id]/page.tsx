import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchSurveyById } from "@/lib/api/surveys";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { SurveyView } from "./survey-view";
import { PageHeader } from "@/components/ui/page-header";
import { AvailabilityCountdown } from "@/components/availability-countdown";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const survey = await fetchSurveyById(id, token);
  if (!survey) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={survey.title || "Опрос"}
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: "Опрос" }]}
        actions={
          <AvailabilityCountdown availableUntil={survey.availableUntil} className="shrink-0" />
        }
      />
      <SurveyView survey={survey} />
    </div>
  );
}
