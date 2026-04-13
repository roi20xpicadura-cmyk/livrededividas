import { useDashboardData } from "@/hooks/useDashboardData";
import GoalTracker from "@/components/dashboard/GoalTracker";
import KPICards from "@/components/dashboard/KPICards";
import DailyTable from "@/components/dashboard/DailyTable";
import AccumulationChart from "@/components/dashboard/AccumulationChart";

export default function Index() {
  const data = useDashboardData();
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-6 md:py-10 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight">
              💸 Painel Financeiro
            </h1>
            <p className="text-muted-foreground text-sm capitalize">{today}</p>
          </div>
        </header>

        {/* Section 1 - Goal Tracker */}
        <GoalTracker
          totalSaved={data.totalSaved}
          remaining={data.remaining}
          progress={data.progress}
          daysElapsed={data.daysElapsed}
          daysRemaining={data.daysRemaining}
          isOnTrack={data.isOnTrack}
          goalReached={data.goalReached}
        />

        {/* Section 2 - KPI Cards */}
        <KPICards
          totalProfit={data.totalProfit}
          totalSaved={data.totalSaved}
          totalRevenue={data.totalRevenue}
          totalAdSpend={data.totalAdSpend}
          avgSavingsPercent={data.avgSavingsPercent}
          avgDailyProfit={data.avgDailyProfit}
        />

        {/* Section 3 - Daily Control Table */}
        <DailyTable entries={data.entries} onAdd={data.addEntry} onRemove={data.removeEntry} />

        {/* Section 4 - Accumulation Chart */}
        <AccumulationChart entries={data.entries} />
      </div>
    </div>
  );
}
