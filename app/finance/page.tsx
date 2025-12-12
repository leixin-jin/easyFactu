import { DashboardLayout } from "@/components/dashboard-layout"
import { FinanceManagement } from "@/components/features/finance"

export default function FinancePage() {
  return (
    <DashboardLayout>
      <FinanceManagement />
    </DashboardLayout>
  )
}
