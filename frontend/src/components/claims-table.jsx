import * as React from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  AlertCircleIcon,
  MoreVerticalIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

const SAMPLE_CLAIMS = [
  {
    id: 1,
    claimNumber: "CLM-2026-0847",
    workflowName: "Customer Support AI",
    incidentType: "Automation regression",
    status: "In Review",
    damageEstimate: 45000,
    createdAt: "2026-02-10",
    reviewer: "Eddie Lake"
  },
  {
    id: 2,
    claimNumber: "CLM-2026-0842",
    workflowName: "Payment Processing Agent",
    incidentType: "Downtime",
    status: "Approved",
    damageEstimate: 128000,
    createdAt: "2026-02-08",
    reviewer: "Sarah Chen"
  },
  {
    id: 3,
    claimNumber: "CLM-2026-0835",
    workflowName: "Fraud Detection Model",
    incidentType: "Decisioning error",
    status: "Done",
    damageEstimate: 67500,
    createdAt: "2026-02-05",
    reviewer: "Jamik Tashpulatov"
  },
  {
    id: 4,
    claimNumber: "CLM-2026-0829",
    workflowName: "Document Processing AI",
    incidentType: "Automation regression",
    status: "In Process",
    damageEstimate: 32000,
    createdAt: "2026-02-03",
    reviewer: "Maya Johnson"
  },
  {
    id: 5,
    claimNumber: "CLM-2026-0821",
    workflowName: "Chatbot Assistant",
    incidentType: "Downtime",
    status: "Done",
    damageEstimate: 89000,
    createdAt: "2026-01-30",
    reviewer: "Carlos Rodriguez"
  },
  {
    id: 6,
    claimNumber: "CLM-2026-0815",
    workflowName: "Risk Assessment Engine",
    incidentType: "Decisioning error",
    status: "In Review",
    damageEstimate: 156000,
    createdAt: "2026-01-28",
    reviewer: "Eddie Lake"
  },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function StatusBadge({ status }) {
  const config = {
    "Done": { icon: CheckCircle2Icon, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    "Approved": { icon: CheckCircle2Icon, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    "In Review": { icon: ClockIcon, className: "border-gray-300 bg-gray-100 text-gray-700" },
    "In Process": { icon: AlertCircleIcon, className: "border-gray-300 bg-gray-100 text-gray-600" },
  }

  const { icon: Icon, className } = config[status] || config["In Process"]

  return (
    <Badge variant="outline" className={`flex gap-1 px-1.5 ${className} [&_svg]:size-3`}>
      <Icon />
      {status}
    </Badge>
  )
}

export function ClaimsTable({ claims = SAMPLE_CLAIMS }) {
  const [page, setPage] = React.useState(0)
  const pageSize = 5
  const totalPages = Math.ceil(claims.length / pageSize)
  const paginatedClaims = claims.slice(page * pageSize, (page + 1) * pageSize)

  const openClaims = claims.filter(c => c.status === "In Review" || c.status === "In Process")
  const resolvedClaims = claims.filter(c => c.status === "Done" || c.status === "Approved")

  return (
    <Tabs defaultValue="all" className="flex w-full flex-col justify-start gap-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="all">All Claims</TabsTrigger>
          <TabsTrigger value="open" className="gap-1">
            Open
            <Badge variant="secondary" className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-700">
              {openClaims.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-1">
            Resolved
            <Badge variant="secondary" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              {resolvedClaims.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <Link to="/dashboard/claims/new">
          <Button size="sm" className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white">
            + New Claim
          </Button>
        </Link>
      </div>

      <TabsContent value="all" className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Incident Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Estimate</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                  <TableCell>{claim.workflowName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground">
                      {claim.incidentType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(claim.damageEstimate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{claim.reviewer}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVerticalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Add Evidence</DropdownMenuItem>
                        <DropdownMenuItem>Contact Reviewer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, claims.length)} of {claims.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="open" className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Incident Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Estimate</TableHead>
                <TableHead>Reviewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                  <TableCell>{claim.workflowName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground">
                      {claim.incidentType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(claim.damageEstimate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{claim.reviewer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="resolved" className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Incident Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Estimate</TableHead>
                <TableHead>Reviewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolvedClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                  <TableCell>{claim.workflowName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground">
                      {claim.incidentType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(claim.damageEstimate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{claim.reviewer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
