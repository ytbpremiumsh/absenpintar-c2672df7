import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, ScanLine, TrendingUp } from "lucide-react";
import { dashboardStats, mockPickupLogs } from "@/data/mockData";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
  { time: "13:00", count: 2 },
  { time: "13:30", count: 5 },
  { time: "14:00", count: 8 },
  { time: "14:30", count: 12 },
  { time: "15:00", count: 6 },
  { time: "15:30", count: 3 },
];

const stats = [
  { label: "Total Siswa", value: dashboardStats.totalStudents, icon: Users, color: "bg-primary/10 text-primary" },
  { label: "Sudah Dijemput", value: dashboardStats.pickedUp, icon: UserCheck, color: "bg-success/10 text-success" },
  { label: "Belum Dijemput", value: dashboardStats.waiting, icon: UserX, color: "bg-destructive/10 text-destructive" },
  { label: "Scan Hari Ini", value: dashboardStats.totalPickups, icon: ScanLine, color: "bg-warning/10 text-warning" },
];

const Dashboard = () => {
  const recentPickups = mockPickupLogs.filter((l) => l.status === "picked_up").slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Ringkasan aktivitas penjemputan hari ini</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="shadow-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Aktivitas Penjemputan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Penjemputan Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPickups.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {log.studentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.studentName}</p>
                  <p className="text-xs text-muted-foreground">{log.class} • {log.pickupTime}</p>
                </div>
                <span className="text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                  Dijemput
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
