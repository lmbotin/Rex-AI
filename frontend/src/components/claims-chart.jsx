import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

// Claims activity data for the last 3 months
const chartData = [
  { date: "2026-01-01", claims: 12, resolved: 8 },
  { date: "2026-01-02", claims: 8, resolved: 6 },
  { date: "2026-01-03", claims: 15, resolved: 11 },
  { date: "2026-01-04", claims: 22, resolved: 18 },
  { date: "2026-01-05", claims: 18, resolved: 14 },
  { date: "2026-01-06", claims: 9, resolved: 7 },
  { date: "2026-01-07", claims: 14, resolved: 12 },
  { date: "2026-01-08", claims: 28, resolved: 22 },
  { date: "2026-01-09", claims: 11, resolved: 9 },
  { date: "2026-01-10", claims: 19, resolved: 15 },
  { date: "2026-01-11", claims: 24, resolved: 20 },
  { date: "2026-01-12", claims: 16, resolved: 13 },
  { date: "2026-01-13", claims: 21, resolved: 17 },
  { date: "2026-01-14", claims: 13, resolved: 11 },
  { date: "2026-01-15", claims: 10, resolved: 8 },
  { date: "2026-01-16", claims: 17, resolved: 14 },
  { date: "2026-01-17", claims: 32, resolved: 26 },
  { date: "2026-01-18", claims: 27, resolved: 23 },
  { date: "2026-01-19", claims: 19, resolved: 16 },
  { date: "2026-01-20", claims: 8, resolved: 7 },
  { date: "2026-01-21", claims: 14, resolved: 12 },
  { date: "2026-01-22", claims: 20, resolved: 17 },
  { date: "2026-01-23", claims: 15, resolved: 13 },
  { date: "2026-01-24", claims: 29, resolved: 24 },
  { date: "2026-01-25", claims: 18, resolved: 15 },
  { date: "2026-01-26", claims: 7, resolved: 6 },
  { date: "2026-01-27", claims: 31, resolved: 27 },
  { date: "2026-01-28", claims: 12, resolved: 10 },
  { date: "2026-01-29", claims: 25, resolved: 21 },
  { date: "2026-01-30", claims: 34, resolved: 29 },
  { date: "2026-01-31", claims: 16, resolved: 14 },
  { date: "2026-02-01", claims: 23, resolved: 19 },
  { date: "2026-02-02", claims: 19, resolved: 16 },
  { date: "2026-02-03", claims: 28, resolved: 24 },
  { date: "2026-02-04", claims: 35, resolved: 30 },
  { date: "2026-02-05", claims: 38, resolved: 33 },
  { date: "2026-02-06", claims: 30, resolved: 26 },
  { date: "2026-02-07", claims: 14, resolved: 12 },
  { date: "2026-02-08", claims: 21, resolved: 18 },
  { date: "2026-02-09", claims: 26, resolved: 23 },
  { date: "2026-02-10", claims: 29, resolved: 25 },
  { date: "2026-02-11", claims: 17, resolved: 15 },
]

const chartConfig = {
  activity: {
    label: "Claims Activity",
  },
  claims: {
    label: "New Claims",
    color: "hsl(var(--chart-1))",
  },
  resolved: {
    label: "Resolved",
    color: "hsl(var(--chart-2))",
  }
}

export function ClaimsChart() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-02-11")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <CardTitle>Claims Activity</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Claim submissions and resolutions over time
          </span>
          <span className="@[540px]/card:hidden">Claims over time</span>
        </CardDescription>
        <div className="absolute right-4 top-4">
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="@[767px]/card:flex hidden">
            <ToggleGroupItem value="90d" className="h-8 px-2.5">
              Last 3 months
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="h-8 px-2.5">
              Last 30 days
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="h-8 px-2.5">
              Last 7 days
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="@[767px]/card:hidden flex w-40" aria-label="Select a value">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillClaims" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-claims)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-claims)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-resolved)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-resolved)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot" />
              } />
            <Area
              dataKey="resolved"
              type="natural"
              fill="url(#fillResolved)"
              stroke="var(--color-resolved)"
              stackId="a" />
            <Area
              dataKey="claims"
              type="natural"
              fill="url(#fillClaims)"
              stroke="var(--color-claims)"
              stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
