import { LineAdminPage } from "../../line-admin-common";

export default async function AdminLineUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LineAdminPage view="user-detail" userId={id} />;
}
