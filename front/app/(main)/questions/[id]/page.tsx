import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchQuestionById } from "@/lib/api/questions";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { QuestionView } from "./question-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { QuestionOwnerActions } from "./question-owner-actions";

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const question = await fetchQuestionById(id, token);
  if (!question) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/main">
          <Button variant="ghost" size="sm">
            К трекам
          </Button>
        </Link>
        {question.canEdit && <QuestionOwnerActions questionId={id} canEdit={question.canEdit} />}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0" />
        <AvailabilityCountdown availableUntil={question.availableUntil} className="shrink-0" />
      </div>
      <QuestionView question={question} />
    </div>
  );
}
