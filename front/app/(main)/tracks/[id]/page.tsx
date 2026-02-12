import { redirect } from "next/navigation";

export default async function TracksDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/main/${id}`);
}
