import { LineAdminPage } from "../../../line/line-admin-common";

export default async function AdminLine2UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LineAdminPage view="user-detail" userId={id} basePath="/admin/line-2" forcedIndustryType="hotel" />;
}
