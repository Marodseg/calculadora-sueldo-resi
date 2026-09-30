import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { Breakdown } from "./components/Breakdown";
import { Calendar } from "./components/Calendar";
import { DaySheet } from "./components/DaySheet";
import { Extras } from "./components/Extras";
import { MonthSwitcher } from "./components/Header";
import { Hero } from "./components/Hero";
import { IconCalendar, IconChart, IconInfo, IconReceipt, IconReset, IconShare, IconTrend } from "./components/icons";
import { Irpf } from "./components/Irpf";
import { ShareSheet } from "./components/ShareSheet";
import { Confirm } from "./components/ui";
import { YearPicker } from "./components/YearPicker";
import { useStore } from "./lib/useStore";

// Pestañas secundarias: se cargan bajo demanda para aligerar la carga inicial.
const History = lazy(() => import("./components/History").then((mod) => ({ default: mod.History })));
const YearView = lazy(() => import("./components/YearView").then((mod) => ({ default: mod.YearView })));
const Info = lazy(() => import("./components/Info").then((mod) => ({ default: mod.Info })));

type Tab = "mes" | "nomina" | "anual" | "historial" | "info";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "mes", label: "Mes", icon: <IconCalendar size={20} /> },
  { id: "nomina", label: "Nómina", icon: <IconReceipt size={20} /> },
  { id: "anual", label: "Año", icon: <IconTrend size={20} /> },
  { id: "historial", label: "Historial", icon: <IconChart size={20} /> },
  { id: "info", label: "Info", icon: <IconInfo size={20} /> },
];

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("mes");
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const openMonth = (month: string) => {
    store.setMonth(month);
    setTab("mes");
  };

  const showsMonthSwitcher = tab === "mes" || tab === "nomina";
  const isConfigured = !!store.data.months[store.month];

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="app">
        {showsMonthSwitcher && (
          <MonthSwitcher month={store.month} onChange={store.setMonth} configured={isConfigured} />
        )}

        <AnimatePresence mode="wait" initial={false}>
          <m.main
            className="page"
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "mes" && (
              <>
                <Hero totals={store.totals} onSeeDetail={() => setTab("nomina")} />
                <YearPicker year={store.cfg.year} onChange={store.setYear} />
                <Calendar month={store.month} cfg={store.cfg} onPick={setOpenDay} />
                <Extras store={store} />
                <Irpf store={store} />
                {isConfigured && (
                  <Confirm
                    title="¿Restablecer este mes?"
                    description="Se borrarán las guardias, días marcados y horas extra de este mes."
                    action="Restablecer"
                    onConfirm={() => {
                      store.resetMonth();
                      toast("Mes restablecido");
                    }}
                    trigger={
                      <button className="link-danger">
                        <IconReset size={14} /> Restablecer este mes
                      </button>
                    }
                  />
                )}
              </>
            )}

            {tab === "nomina" && (
              <>
                <Hero totals={store.totals} />
                <button className="btn share-btn" onClick={() => setShareOpen(true)}>
                  <IconShare size={16} /> Compartir resumen del mes
                </button>
                <Breakdown store={store} />
              </>
            )}

            <Suspense fallback={null}>
              {tab === "anual" && <YearView store={store} onOpen={openMonth} />}
              {tab === "historial" && (
                <>
                  <h1 className="page-title">Historial</h1>
                  <History store={store} onOpen={openMonth} />
                </>
              )}
              {tab === "info" && (
                <>
                  <h1 className="page-title">Información</h1>
                  <Info store={store} />
                </>
              )}
            </Suspense>
          </m.main>
        </AnimatePresence>

        <DaySheet
          month={store.month}
          cfg={store.cfg}
          day={openDay}
          onClose={() => setOpenDay(null)}
          onChange={store.setDay}
        />

        <ShareSheet store={store} open={shareOpen} onOpenChange={setShareOpen} />

        <Toaster position="top-center" richColors closeButton={false} toastOptions={{ className: "toast" }} />

        <nav className="tabbar" aria-label="Secciones">
          <div className="tabbar-inner">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "on" : ""}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => setTab(t.id)}
              >
                {tab === t.id && (
                  <m.span
                    layoutId="tabpill"
                    className="tab-pill"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="tab-ico">{t.icon}</span>
                <span className="tab-lbl">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </LazyMotion>
  );
}
