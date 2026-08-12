import { redirect } from "next/navigation";

export default async function AdminLine2UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  redirect(`/admin/line/users/${id}`);
}
