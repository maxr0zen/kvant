import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchSurveyById } from "@/lib/api/surveys";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { SurveyView } from "./survey-view";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/main">
          <Button variant="ghost" size="sm">
            К трекам
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0" />
        <AvailabilityCountdown availableUntil={survey.availableUntil} className="shrink-0" />
      </div>
      <SurveyView survey={survey} />
    </div>
  );
}
