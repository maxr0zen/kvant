import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchQuestionById } from "@/lib/api/questions";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { QuestionView } from "./question-view";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={question.title || "Вопрос"}
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: "Вопрос" }]}
        actions={
          <div className="flex items-center gap-2">
            <AvailabilityCountdown availableUntil={question.availableUntil} className="shrink-0" />
            {question.canEdit && <QuestionOwnerActions questionId={id} canEdit={question.canEdit} />}
          </div>
        }
      />
      <QuestionView question={question} />
    </div>
  );
}
