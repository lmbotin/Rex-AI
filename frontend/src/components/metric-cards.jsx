import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function MetricCards({ metrics }) {
  return (
    <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-emerald-500/5 *:data-[slot=card]:to-card">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Active Policies</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {metrics.activePolicies || 12}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
              <TrendingUpIcon className="size-3" />
              +3
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            All policies in good standing <TrendingUpIcon className="size-4 text-emerald-600" />
          </div>
          <div className="text-muted-foreground">
            Coverage: ${((metrics.totalProtectedValue || 48500000) / 1000000).toFixed(0)}M total
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Total Reimbursed</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            ${(metrics.closedClaimsPaidBack / 1000000).toFixed(1)}M
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
              <TrendingUpIcon className="size-3" />
              +12.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong claims payouts <TrendingUpIcon className="size-4 text-emerald-600" />
          </div>
          <div className="text-muted-foreground">
            {metrics.approvedPaidCount} claims paid out
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Resolution Rate</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {metrics.resolutionRate.toFixed(1)}%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
              <TrendingUpIcon className="size-3" />
              +2.3%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Claims successfully resolved <TrendingUpIcon className="size-4 text-emerald-600" />
          </div>
          <div className="text-muted-foreground">Exceeds target of 95%</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Avg. Resolution Time</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {metrics.avgCloseDays.toFixed(1)} days
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
              <TrendingDownIcon className="size-3" />
              -0.5 days
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Faster processing <TrendingDownIcon className="size-4 text-emerald-600" />
          </div>
          <div className="text-muted-foreground">Improved from 4.7 days</div>
        </CardFooter>
      </Card>
    </div>
  )
}
