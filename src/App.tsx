import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Breakdown } from "./components/Breakdown";
import { Calendar } from "./components/Calendar";
import { DaySheet } from "./components/DaySheet";
import { Extras } from "./components/Extras";
import { MonthSwitcher } from "./components/Header";
import { Hero, YearPicker } from "./components/Hero";
import { History } from "./components/History";
import { Info } from "./components/Info";
import { Irpf } from "./components/Irpf";
import { IconCalendar, IconChart, IconInfo, IconReceipt, IconReset } from "./components/icons";
import { Confirm } from "./components/ui";
import { useStore } from "./lib/useStore";

type Tab = "mes" | "nomina" | "historial" | "info";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "mes", label: "Mes", icon: <IconCalendar /> },
  { id: "nomina", label: "Nómina", icon: <IconReceipt /> },
  { id: "historial", label: "Historial", icon: <IconChart /> },
  { id: "info", label: "Info", icon: <IconInfo /> },
];

export default function App() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("mes");
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const open = (m: string) => {
    s.setMonth(m);
    setTab("mes");
  };

  return (
    <div className="app">
      {(tab === "mes" || tab === "nomina") && (
        <MonthSwitcher month={s.month} onChange={s.setMonth} configured={!!s.data.months[s.month]} />
      )}
      <AnimatePresence mode="wait" initial={false}>
      <motion.main className="page" key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
        {tab === "mes" && (
          <>
            <Hero totals={s.totals} onSeeDetail={() => setTab("nomina")} />
            <YearPicker year={s.cfg.year} onChange={s.setYear} />
            <Calendar month={s.month} cfg={s.cfg} onPick={setDay} />
            <Extras s={s} />
            <Irpf s={s} />
            {s.data.months[s.month] && (
              <Confirm
                title="¿Restablecer este mes?" description="Se borrarán las guardias, días marcados y horas extra de este mes." action="Restablecer"
                onConfirm={() => { s.resetMonth(); toast("Mes restablecido"); }}
                trigger={<button className="link-danger"><IconReset size={14} /> Restablecer este mes</button>}
              />
            )}
          </>
        )}
        {tab === "nomina" && (
          <>
            <Hero totals={s.totals} onSeeDetail={() => {}} />
            <Breakdown s={s} />
          </>
        )}
        {tab === "historial" && (
          <>
            <h1 className="page-title">Historial</h1>
            <History s={s} onOpen={open} />
          </>
        )}
        {tab === "info" && (
          <>
            <h1 className="page-title">Información</h1>
            <Info s={s} />
          </>
        )}
      </motion.main>
      </AnimatePresence>

      <DaySheet month={s.month} cfg={s.cfg} day={day} onClose={() => setDay(null)} onChange={s.setDay} />

      <Toaster position="top-center" richColors closeButton={false} toastOptions={{ className: "toast" }} />
      <nav className="tabbar" aria-label="Secciones">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
              {tab === t.id && <motion.span layoutId="tabpill" className="tab-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
              <span className="tab-ico">{t.icon}</span>
              <span className="tab-lbl">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
