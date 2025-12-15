import { DashboardLayout } from "@/components/dashboard-layout"
import { DailyClosureManagement } from "@/components/features/daily-closure"

export default function DailyClosurePage() {
  return (
    <DashboardLayout>
      <DailyClosureManagement />
    </DashboardLayout>
  )
}

