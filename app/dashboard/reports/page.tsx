import { Metadata } from "next";
import { BarChart3, TrendingUp, Calendar, Download, Trophy, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reports & Analytics | FutureLink POS",
  description: "View restaurant performance reports and charts",
};

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gradient">Reports & Analytics</h1>
          <p className="text-muted-foreground font-medium mt-1">
            Real-time visual analysis of your restaurant's sales and employee performance.
          </p>
        </div>
        <Button className="font-bold shadow-lg shadow-primary/20 shrink-0 h-11 px-6 rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0">
          <Download className="size-4 mr-2" />
          Export Report Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="size-4.5 text-emerald-500" />
              Sales Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">+12.5%</div>
            <p className="text-xs font-semibold text-muted-foreground mt-1.5">Compared to previous month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="size-4.5 text-blue-500" />
              Avg. Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">$42.50</div>
            <p className="text-xs font-semibold text-muted-foreground mt-1.5">Based on 1.2k orders this week</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="size-4.5 text-purple-500" />
              Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-purple-655 dark:text-purple-400">7 PM - 9 PM</div>
            <p className="text-xs font-semibold text-muted-foreground mt-1.5">Highest customer turnover rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Custom SVG Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Trend Line Area Chart */}
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg lg:col-span-2 rounded-3xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
            <CardTitle className="text-lg font-bold">Daily Sales Volume</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="w-full h-64 flex items-center justify-center text-slate-800 dark:text-slate-200">
              <svg viewBox="0 0 500 200" className="w-full h-full">
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="50" y1="20" x2="480" y2="20" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
                <line x1="50" y1="70" x2="480" y2="70" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
                <line x1="50" y1="120" x2="480" y2="120" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
                <line x1="50" y1="170" x2="480" y2="170" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />

                {/* Y Axis labels */}
                <text x="40" y="24" textAnchor="end" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">$1.5k</text>
                <text x="40" y="74" textAnchor="end" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">$1.0k</text>
                <text x="40" y="124" textAnchor="end" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">$500</text>
                <text x="40" y="174" textAnchor="end" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">$0</text>

                {/* Area under the line */}
                <path d="M 50 170 L 50 120 L 120 100 L 190 140 L 260 90 L 330 65 L 400 45 L 480 35 L 480 170 Z" fill="url(#salesGrad)" />

                {/* Main line */}
                <path d="M 50 120 L 120 100 L 190 140 L 260 90 L 330 65 L 400 45 L 480 35" fill="none" stroke="var(--color-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Value Data Points */}
                <circle cx="50" cy="120" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                <circle cx="120" cy="100" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                <circle cx="190" cy="140" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                <circle cx="260" cy="90" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                <circle cx="330" cy="65" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                <circle cx="400" cy="45" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                <circle cx="480" cy="35" r="4.5" fill="var(--color-primary)" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />

                {/* X Axis labels */}
                <text x="50" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Mon</text>
                <text x="120" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Tue</text>
                <text x="190" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Wed</text>
                <text x="260" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Thu</text>
                <text x="330" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Fri</text>
                <text x="400" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Sat</text>
                <text x="480" y="192" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Sun</text>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Donut Chart */}
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
            <CardTitle className="text-lg font-bold">Category Shares</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center h-[256px]">
            <div className="relative size-40 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="size-full">
                {/* Circumference = 2 * PI * r = 2 * 3.14159 * 70 = 439.8 */}
                {/* Drinks segment (45%): 439.8 * 0.45 = 197.9 */}
                <circle cx="100" cy="100" r="70" fill="none" stroke="var(--color-primary)" strokeWidth="22" strokeDasharray="198 440" strokeDashoffset="0" transform="rotate(-90 100 100)" strokeLinecap="round" />
                {/* Food segment (40%): 439.8 * 0.40 = 175.9. Offset = -198 */}
                <circle cx="100" cy="100" r="70" fill="none" stroke="#2563eb" strokeWidth="22" strokeDasharray="176 440" strokeDashoffset="-198" transform="rotate(-90 100 100)" strokeLinecap="round" />
                {/* Desserts segment (15%): 439.8 * 0.15 = 66.0. Offset = -374 */}
                <circle cx="100" cy="100" r="70" fill="none" stroke="#f59e0b" strokeWidth="22" strokeDasharray="66 440" strokeDashoffset="-374" transform="rotate(-90 100 100)" strokeLinecap="round" />
              </svg>
              {/* Inner details */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black tracking-tight">100%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menu Sales</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="flex gap-4 mt-6 text-xs font-bold justify-center">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Drinks (45%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-blue-600" />
                <span className="text-muted-foreground">Food (40%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Desserts (15%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sellers and Top Staff Side-by-Side Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Sellers */}
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Flame className="size-5 text-amber-500 animate-pulse" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-medium">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pt-1 pl-2">Rank</th>
                    <th className="pb-3 pt-1">Menu Item</th>
                    <th className="pb-3 pt-1 text-center">Orders</th>
                    <th className="pb-3 pt-1 text-right pr-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {[
                    { rank: 1, name: "Special Milk Tea", count: 480, revenue: "$1,680.00" },
                    { rank: 2, name: "Spicy Chicken Curry", count: 320, revenue: "$3,840.00" },
                    { rank: 3, name: "Matcha Cheesecake", count: 210, revenue: "$1,155.00" },
                    { rank: 4, name: "Mango Sticky Rice", count: 180, revenue: "$990.00" },
                    { rank: 5, name: "Fresh Lime Soda", count: 154, revenue: "$462.00" },
                  ].map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 pl-2 text-muted-foreground font-bold">#{item.rank}</td>
                      <td className="py-3 font-bold text-foreground">{item.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{item.count}</td>
                      <td className="py-3 text-right font-black pr-2 text-primary">{item.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Waiters */}
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="size-5 text-yellow-500 animate-bounce" />
              Top Performing Waitstaff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-medium">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pt-1 pl-2">Rank</th>
                    <th className="pb-3 pt-1">Waiter Name</th>
                    <th className="pb-3 pt-1 text-center">Orders Served</th>
                    <th className="pb-3 pt-1 text-right pr-2">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {[
                    { rank: 1, name: "John Doe", orders: 250, total: "$6,120.00" },
                    { rank: 2, name: "Sophia Miller", orders: 215, total: "$5,340.00" },
                    { rank: 3, name: "Emma Watson", orders: 194, total: "$4,850.00" },
                    { rank: 4, name: "Daniel Craig", orders: 154, total: "$3,620.00" },
                    { rank: 5, name: "Rupert Grint", orders: 120, total: "$2,890.00" },
                  ].map((staff) => (
                    <tr key={staff.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 pl-2 text-muted-foreground font-bold">#{staff.rank}</td>
                      <td className="py-3 font-bold text-foreground">{staff.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{staff.orders}</td>
                      <td className="py-3 text-right font-black pr-2 text-primary">{staff.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
