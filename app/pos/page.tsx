import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { POSInterface } from "@/components/pos-interface"

export default function POSPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <POSInterface />
      </Suspense>
    </DashboardLayout>
  )
}
