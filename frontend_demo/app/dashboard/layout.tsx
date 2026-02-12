// app/dashboard/settings/layout.tsx
import DashboardLayout from '@/components/layout';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 如果 DashboardLayout 还需要 products / subscription，就在这里一并拉取
  // const products = await getProducts(); // 自己封装的函数
  // const subscription = await getSubscription(user.id);

  return (
    <DashboardLayout
      user={user}
      userDetails={user.user_metadata}
      products={[]}        // 按需换成真实数据
      subscription={null}  // 按需换成真实数据
      title="Account Settings"
      description="Profile settings."
    >
      {children}
    </DashboardLayout>
  );
}