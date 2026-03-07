import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, UserX, Clock } from "lucide-react";
import { mockPickupLogs } from "@/data/mockData";
import { motion } from "framer-motion";

const Monitoring = () => {
  const waiting = mockPickupLogs.filter((l) => l.status === "waiting");
  const pickedUp = mockPickupLogs.filter((l) => l.status === "picked_up");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Penjemputan</h1>
        <p className="text-muted-foreground text-sm">Pantau status penjemputan siswa secara realtime</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Belum Dijemput */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <h2 className="font-semibold">Belum Dijemput ({waiting.length})</h2>
          </div>
          <div className="space-y-3">
            {waiting.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card border-0 border-l-4 border-l-destructive">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold">
                        {log.studentName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{log.studentName}</p>
                        <p className="text-xs text-muted-foreground">{log.class} • Wali: {log.parentName}</p>
                      </div>
                      <div className="flex items-center gap-1 text-destructive">
                        <UserX className="h-4 w-4" />
                        <span className="text-xs font-medium">Menunggu</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sudah Dijemput */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <h2 className="font-semibold">Sudah Dijemput ({pickedUp.length})</h2>
          </div>
          <div className="space-y-3">
            {pickedUp.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card border-0 border-l-4 border-l-success">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-success/10 flex items-center justify-center text-success font-bold">
                        {log.studentName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{log.studentName}</p>
                        <p className="text-xs text-muted-foreground">{log.class} • Wali: {log.parentName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-success">
                          <UserCheck className="h-4 w-4" />
                          <span className="text-xs font-medium">Dijemput</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span className="text-[11px]">{log.pickupTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
