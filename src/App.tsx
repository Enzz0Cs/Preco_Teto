import React, { useState, useEffect } from "react";
import { Search, TrendingUp, Shield, AlertTriangle, CheckCircle2, Info, Loader2, BarChart3, Wallet, Share2, Download, Trash2, Copy, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// --- Types ---
// ... (rest of types)

interface TickerData {
  ticker: string;
  type: "acoes" | "fiis";
  price: number;
  lpa?: number;
  vpa: number;
  roe?: number;
  dy: number;
  dividendsLtmValue?: number;
  dividends12m?: number;
  pvp?: number;
  fiiType?: 'tijolo' | 'papel' | 'misto';
  vacancia?: number;
  rendimentoMensal?: number;
  benchmark?: number;
  spread?: number;
  history?: { date: string; price: number }[];
}

interface Results {
  graham?: number;
  plTarget?: number;
  pvpTarget?: number;
  bazin?: number;
  finalPrice?: number;
  fiiPt?: number;
  margin: number;
  verdict: "PECHINCHA" | "ACEITÁVEL" | "AGUARDAR";
  verdictColor: string;
}

interface SavedAnalysis {
  id: string;
  date: string;
  ticker: string;
  type: "acoes" | "fiis";
  price: number;
  targetPrice: number;
  margin: number;
  verdict: string;
  verdictColor: string;
  indicators: {
    lpa?: number;
    vpa: number;
    roe?: number;
    dy: number;
    pvp?: number;
    divs: number;
    fiiType?: string;
    vacancia?: number;
    rendimentoMensal?: number;
    benchmark?: number;
    spread?: number;
  };
}

// --- Components ---

const PriceChart = ({ data, color }: { data: { date: string; price: number }[], color: string }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            hide 
          />
          <YAxis 
            domain={['auto', 'auto']} 
            hide 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '10px',
              color: '#fff'
            }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Preço']}
            labelStyle={{ display: 'none' }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, subValue, index }: { label: string; value: string; icon: any; subValue?: string; index?: number }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
        <Icon size={18} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{value}</div>
    {subValue && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{subValue}</div>}
  </motion.div>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function App() {
  const [data, setData] = useState<TickerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [saved, setSaved] = useState<SavedAnalysis[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
             (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return true;
  });

  const handleCreateNew = (type: 'acoes' | 'fiis') => {
    const emptyData: TickerData = {
      ticker: "NOVO_ATIVO",
      type,
      price: 0,
      lpa: 0,
      vpa: 0,
      roe: 0,
      dy: 0,
      dividendsLtmValue: 0,
      dividends12m: 0,
      pvp: 0,
      fiiType: 'tijolo',
      vacancia: 0,
      rendimentoMensal: 0,
      benchmark: 6.20, // Padrão IPCA+ atual aproximado
      spread: 2, // Padrão +2%
      history: []
    };
    setData(emptyData);
    setResults(null);
    setError(null);
  };

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Pure calculation function for internal use
  const runCalculation = (tickerData: TickerData) => {
    if (tickerData.type === "acoes") {
      const lpa = tickerData.lpa || 0;
      const vpa = tickerData.vpa || 0;
      const div = tickerData.dividendsLtmValue || 0;

      const graham = lpa > 0 && vpa > 0 ? Math.sqrt(22.5 * lpa * vpa) : 0;
      const plTarget = lpa * 10;
      const pvpTarget = vpa * 1.5;
      const bazin = div / 0.06;

      const finalPrice = graham * 0.4 + plTarget * 0.3 + pvpTarget * 0.2 + bazin * 0.1;
      const margin = finalPrice > 0 ? ((finalPrice - tickerData.price) / finalPrice) * 100 : 0;

      let verdict: "PECHINCHA" | "ACEITÁVEL" | "AGUARDAR" = "AGUARDAR";
      let verdictColor = "text-rose-500";

      if (margin > 20) {
        verdict = "PECHINCHA";
        verdictColor = "text-emerald-400";
      } else if (margin > 0) {
        verdict = "ACEITÁVEL";
        verdictColor = "text-amber-400";
      }

      setResults({ graham, plTarget, pvpTarget, bazin, finalPrice, margin, verdict, verdictColor });
    } else {
      const rendimentoMensal = tickerData.rendimentoMensal || 0;
      const benchmark = tickerData.benchmark || 6.20;
      const spread = tickerData.spread || 2;
      
      // Cálculo do Preço Teto: (Rendimento Mensal * 12) / ((Taxa Base + Spread) / 100)
      const taxaAlvo = (benchmark + spread) / 100;
      const fiiPt = taxaAlvo > 0 ? (rendimentoMensal * 12) / taxaAlvo : 0;
      
      const margin = fiiPt > 0 ? ((fiiPt - tickerData.price) / fiiPt) * 100 : 0;

      let verdict: "PECHINCHA" | "ACEITÁVEL" | "AGUARDAR" = "AGUARDAR";
      let verdictColor = "text-rose-500";

      if (margin > 15) {
        verdict = "PECHINCHA";
        verdictColor = "text-emerald-400";
      } else if (margin > 0) {
        verdict = "ACEITÁVEL";
        verdictColor = "text-amber-400";
      }

      setResults({ fiiPt, finalPrice: fiiPt, margin, verdict, verdictColor });
    }
  };

  // Sync calculation whenever data changes
  useEffect(() => {
    if (data) {
      runCalculation(data);
    }
  }, [data]);

  const handleIndicatorChange = (field: keyof TickerData, value: any) => {
    if (!data) return;
    
    let newData = { ...data };

    if (field === 'fiiType') {
      newData.fiiType = value;
      // Ajuste automático de spread sugerido (exemplo: tijolo é mais arriscado que papel)
      if (value === 'tijolo') newData.spread = 3;
      else if (value === 'papel') newData.spread = 1;
      else newData.spread = 2; // misto
    } else {
      const numValue = value === "" ? 0 : parseFloat(String(value).replace(",", ".")) || 0;
      newData[field] = numValue as any;

      // Sincronização Automática: Yield % vs Reais (R$)
      if (field === 'dy') {
        const calculatedValue = parseFloat(((numValue / 100) * data.price).toFixed(2));
        newData.dividendsLtmValue = calculatedValue;
        newData.dividends12m = calculatedValue;
        newData.rendimentoMensal = parseFloat((calculatedValue / 12).toFixed(2));
      } else if (field === 'dividendsLtmValue' || field === 'dividends12m') {
        if (data.price > 0) {
          const calculatedYield = parseFloat(((numValue / data.price) * 100).toFixed(2));
          newData.dy = calculatedYield;
          if (field === 'dividendsLtmValue') newData.dividends12m = numValue;
          else newData.dividendsLtmValue = numValue;
          newData.rendimentoMensal = parseFloat((numValue / 12).toFixed(2));
        }
      } else if (field === 'rendimentoMensal') {
        const annualDiv = numValue * 12;
        newData.dividends12m = annualDiv;
        newData.dividendsLtmValue = annualDiv;
        if (data.price > 0) {
          newData.dy = parseFloat(((annualDiv / data.price) * 100).toFixed(2));
        }
      } else if (field === 'price' && numValue > 0) {
        newData.dy = parseFloat(((data.dividendsLtmValue / numValue) * 100).toFixed(2));
      } else if (field === 'vpa' && numValue > 0 && data.type === 'fiis') {
        // Atualiza P/VP se o preço mudar ou o VPA mudar
        newData.pvp = parseFloat((data.price / numValue).toFixed(2));
      } else if (field === 'price' && numValue > 0 && data.type === 'fiis' && data.vpa > 0) {
        newData.pvp = parseFloat((numValue / data.vpa).toFixed(2));
      }
    }

    setData(newData);
  };

  // Load saved on mount
  useEffect(() => {
    const stored = localStorage.getItem("invest_analyses");
    if (stored) setSaved(JSON.parse(stored));
  }, []);

  const saveToStorage = (newSaved: SavedAnalysis[]) => {
    setSaved(newSaved);
    localStorage.setItem("invest_analyses", JSON.stringify(newSaved));
  };

  const generateReport = (analysis: SavedAnalysis | { data: TickerData, results: Results }) => {
    let ticker, type, price, target, margin, verdict, ind;

    if ('data' in analysis) {
      // It's { data, results }
      const d = analysis.data;
      const r = analysis.results;
      ticker = d.ticker;
      type = d.type;
      price = d.price;
      target = r.finalPrice;
      margin = r.margin;
      verdict = r.verdict;
      ind = {
        lpa: d.lpa,
        vpa: d.vpa,
        roe: d.roe,
        dy: d.dy,
        pvp: d.pvp,
        divs: type === 'acoes' ? d.dividendsLtmValue : d.dividends12m,
        fiiType: d.fiiType,
        vacancia: d.vacancia,
        rendimentoMensal: d.rendimentoMensal,
        benchmark: d.benchmark,
        spread: d.spread
      };
    } else {
      // It's SavedAnalysis
      ticker = analysis.ticker;
      type = analysis.type;
      price = analysis.price;
      target = analysis.targetPrice;
      margin = analysis.margin;
      verdict = analysis.verdict;
      ind = analysis.indicators;
    }

    const fiiExtra = type === 'fiis' ? `
- Tipo: ${ind.fiiType?.toUpperCase()}
- Vacância: ${ind.vacancia?.toFixed(2)}%
- Rend. Mensal: R$ ${ind.rendimentoMensal?.toFixed(2)}
- Taxa Alvo (IPCA+): ${ind.benchmark?.toFixed(2)}% + ${ind.spread?.toFixed(2)}%
`.trim() : "";

    return `
🤖 ROBÔ DE VALOR - RELATÓRIO
--------------------------------------------------
ATIVO: ${ticker} (${type.toUpperCase()})
PREÇO ATUAL: R$ ${price?.toFixed(2)}
--------------------------------------------------
📊 INDICADORES:
- VPA: R$ ${ind.vpa.toFixed(2)}
- Yield: ${ind.dy.toFixed(2)}%
${type === 'acoes' ? `- LPA: R$ ${ind.lpa?.toFixed(2)}\n- ROE: ${ind.roe?.toFixed(2)}%` : `- P/VP: ${ind.pvp?.toFixed(2) || 'N/A'}`}
- Dividendo Anual: R$ ${ind.divs?.toFixed(2)}
${fiiExtra}

🎯 VALUATIONS:
- PREÇO TETO IDEAL: R$ ${target?.toFixed(2)}
- MARGEM DE SEGURANÇA: ${margin?.toFixed(2)}%

🏁 VEREDITO: ${verdict}
--------------------------------------------------
Relatório gerado via Protocolo Investidor10 v2.5
    `.trim();
  };

  const handleSave = () => {
    if (!data || !results) return;
    
    const newAnalysis: SavedAnalysis = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      ticker: data.ticker,
      type: data.type,
      price: data.price,
      targetPrice: results.finalPrice || 0,
      margin: results.margin,
      verdict: results.verdict,
      verdictColor: results.verdictColor,
      indicators: {
        lpa: data.lpa,
        vpa: data.vpa,
        roe: data.roe,
        dy: data.dy,
        pvp: data.pvp,
        divs: data.type === 'acoes' ? (data.dividendsLtmValue || 0) : (data.dividends12m || 0),
        fiiType: data.fiiType,
        vacancia: data.vacancia,
        rendimentoMensal: data.rendimentoMensal,
        benchmark: data.benchmark,
        spread: data.spread
      }
    };

    const updated = [newAnalysis, ...saved].slice(0, 20); 
    saveToStorage(updated);
  };

  const shareAnalysis = async (analysis: SavedAnalysis) => {
    const text = generateReport(analysis);
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(analysis.id);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const downloadTextFile = (analysis: SavedAnalysis) => {
    const content = generateReport(analysis);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analise_${analysis.ticker}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteSaved = (id: string) => {
    const updated = saved.filter(s => s.id !== id);
    saveToStorage(updated);
  };

  const downloadTxt = () => {
    if (!data || !results) return;
    const analysisForReport = { data, results };
    const content = generateReport(analysisForReport as any);

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analise_${data.ticker}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareAllSaved = async () => {
    if (saved.length === 0) return;
    const reports = saved.map(item => generateReport(item)).join("\n\n" + "=".repeat(50) + "\n\n");
    const header = `📋 RELATÓRIO CONSOLIDADO DE INVESTIMENTOS\nGERADO EM: ${new Date().toLocaleString()}\nTOTAL DE ATIVOS: ${saved.length}\n\n`;
    const fullText = header + reports;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopySuccess("all");
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy all", err);
    }
  };

  const downloadAllSaved = () => {
    if (saved.length === 0) return;
    const reports = saved.map(item => generateReport(item)).join("\n\n" + "=".repeat(50) + "\n\n");
    const header = `📋 RELATÓRIO CONSOLIDADO DE INVESTIMENTOS\nGERADO EM: ${new Date().toLocaleString()}\nTOTAL DE ATIVOS: ${saved.length}\n\n`;
    const fullText = header + reports;

    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carteira_consolidada_${new Date().toLocaleDateString().replace(/\//g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'} text-slate-900 dark:text-slate-100 font-sans p-6 md:p-12`}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 dark:bg-emerald-500 text-white font-mono font-bold px-4 py-2 rounded text-2xl shadow-lg shadow-emerald-500/20">
              {data ? data.ticker : "INVEST"}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Robô de Valor</h1>
              <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm font-bold italic uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Modo Offline Manual Ativado
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="grid grid-cols-2 gap-2 flex-1 md:flex-initial">
              <button 
                onClick={() => handleCreateNew('acoes')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5 hover:scale-105 active:scale-95 italic"
              >
                <TrendingUp size={14} /> Analisar Ação
              </button>
              <button 
                onClick={() => handleCreateNew('fiis')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/5 hover:scale-105 active:scale-95 italic"
              >
                <Wallet size={14} /> Analisar FII
              </button>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 shadow-sm active:scale-95"
              title={darkMode ? "Ativar Modo Luz" : "Ativar Modo Escuro"}
            >
              {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Results Layout */}
        <main className="grid grid-cols-12 gap-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="col-span-12">
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-6 rounded-3xl flex items-center gap-4 text-sm font-black uppercase tracking-tight shadow-lg shadow-rose-500/5">
                  <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20 animate-pulse">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-rose-700 dark:text-rose-300 uppercase italic">Erro de Sistema</h4>
                    <p className="font-mono text-xs opacity-75">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!data && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-12 py-32 text-center"
            >
              <div className="relative inline-block mb-10">
                <div className="absolute -inset-4 bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="relative w-32 h-32 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <BarChart3 className="text-emerald-500" size={56} />
                </div>
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute -top-4 -right-4 w-12 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center shadow-xl text-3xl"
                >
                  📡
                </motion.div>
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter italic">Terminal Robô de Valor</h2>
              <p className="text-slate-400 dark:text-slate-500 text-base max-w-sm mx-auto font-bold leading-relaxed italic">
                Selecione acima se deseja analisar uma Ação ou um FII e preencha os indicadores para calcular o valuation.
              </p>
            </motion.div>
          )}

          {data && results && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="col-span-12 grid grid-cols-12 gap-8"
            >
              {/* Left Column: Indicators */}
              <motion.section variants={itemVariants} className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-emerald-500/20 dark:border-emerald-500/10 p-8 shadow-2xl shadow-black/5 dark:shadow-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                  <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-8 flex items-center gap-3 tracking-[0.3em] relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" />
                    Terminal de Ajuste Manual
                  </h2>
                  <div className="space-y-4 relative">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Identificador (Ticker)</label>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                        <input 
                          type="text" 
                          value={data.ticker}
                          onChange={(e) => handleIndicatorChange('ticker', e.target.value.toUpperCase())}
                          className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white uppercase"
                          placeholder="EX: PETR4"
                        />
                      </div>
                    </div>

                    {data.type === 'acoes' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Lucro (LPA)</label>
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                            <span className="text-slate-400 font-mono text-sm mr-2">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={data.lpa}
                              onChange={(e) => handleIndicatorChange('lpa', e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Patrimônio (VPA)</label>
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                            <span className="text-slate-400 font-mono text-sm mr-2">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={data.vpa}
                              onChange={(e) => handleIndicatorChange('vpa', e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Dividendo (Yield %)</label>
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                            <input 
                              type="number" 
                              step="0.01"
                              value={data.dy}
                              onChange={(e) => handleIndicatorChange('dy', e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400"
                            />
                            <span className="text-slate-400 font-mono text-sm ml-2">%</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Dividendo (R$ LTM)</label>
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                            <span className="text-slate-400 font-mono text-sm mr-2">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={data.dividendsLtmValue}
                              onChange={(e) => handleIndicatorChange('dividendsLtmValue', e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Preço de Mercado (Atual)</label>
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                            <span className="text-slate-400 font-mono text-sm mr-2">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={data.price}
                              onChange={(e) => handleIndicatorChange('price', e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Tipo de Fundo</label>
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-1">
                            {['tijolo', 'papel', 'misto'].map((t) => (
                              <button
                                key={t}
                                onClick={() => handleIndicatorChange('fiiType', t)}
                                className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${data.fiiType === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm scale-105' : 'text-slate-400'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Patrimônio (VPA)</label>
                            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                              <span className="text-slate-400 font-mono text-sm mr-2">R$</span>
                              <input 
                                type="number" 
                                step="0.10"
                                value={data.vpa}
                                onChange={(e) => handleIndicatorChange('vpa', e.target.value)}
                                className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">P/VP Atual</label>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 opacity-60">
                              <span className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white">
                                {data.pvp?.toFixed(2) || '---'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Vacância</label>
                            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                              <input 
                                type="number" 
                                step="0.1"
                                value={data.vacancia}
                                onChange={(e) => handleIndicatorChange('vacancia', e.target.value)}
                                className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                              />
                              <span className="text-slate-400 font-mono text-sm ml-2">%</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Rend. Mensal</label>
                            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                              <span className="text-slate-400 font-mono text-sm mr-1">R$</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={data.rendimentoMensal}
                                onChange={(e) => handleIndicatorChange('rendimentoMensal', e.target.value)}
                                className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Taxa Base (IPCA+)</label>
                            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                              <input 
                                type="number" 
                                step="0.01"
                                value={data.benchmark}
                                onChange={(e) => handleIndicatorChange('benchmark', e.target.value)}
                                className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                              />
                              <span className="text-slate-400 font-mono text-sm ml-2">%</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Prêmio Risco</label>
                            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                              <span className="text-slate-400 font-mono text-sm mr-1">+</span>
                              <input 
                                type="number" 
                                step="0.5"
                                value={data.spread}
                                onChange={(e) => handleIndicatorChange('spread', e.target.value)}
                                className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                              />
                              <span className="text-slate-400 font-mono text-sm ml-2">%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-2 italic">Preço de Mercado (Atual)</label>
                          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 focus-within:ring-2 ring-emerald-500/20 transition-all">
                            <span className="text-slate-400 font-mono text-sm mr-2">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={data.price}
                              onChange={(e) => handleIndicatorChange('price', e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-slate-900 dark:bg-slate-800 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                  <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-4 tracking-[0.3em] relative group-hover:text-slate-400">Data Feed Status</h2>
                  <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-bold italic relative group-hover:text-white transition-colors duration-500">
                    {data.ticker.includes('.SA') ? 
                      "Sinal B3 processado. Note: Cotações Yahoo podem ter delay de 15min em relação ao tempo real." : 
                      "Processamento finalizado. Protocolo de margem sincronizado com volatilidade atual. Terminal pronto."
                    }
                  </p>
                </div>
              </motion.section>

              {/* Right Column: Calculations and Verdict */}
              <motion.section variants={itemVariants} className="col-span-12 lg:col-span-8 flex flex-col gap-8">
                {/* Master Verdict Card */}
                <div className="bg-slate-900 dark:bg-slate-900 border-4 border-slate-800 p-8 md:p-12 text-white relative overflow-hidden shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] rounded-[3rem]">
                  <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-[180px] font-black leading-none rotate-12 select-none pointer-events-none tracking-tighter">
                    {data.ticker}
                  </div>
                  
                  <div className="relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                      <div className="flex items-center gap-4 bg-white/5 py-3 px-6 rounded-2xl border border-white/10 shadow-inner">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-pulse ${results.verdict === 'PECHINCHA' ? 'bg-emerald-400 shadow-emerald-400/50' : results.verdict === 'ACEITÁVEL' ? 'bg-amber-400 shadow-amber-400/50' : 'bg-rose-400 shadow-rose-400/50'}`} />
                        <p className="text-white/70 font-black text-xs uppercase tracking-[0.4em] italic">Preço Teto Consolidado</p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={downloadTxt}
                          className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[1.5rem] transition-all text-white shadow-xl active:scale-90"
                          title="Baixar Relatório Raw"
                        >
                          <Download size={20} />
                        </button>
                        <button 
                          onClick={handleSave}
                          className="p-4 bg-emerald-600 hover:bg-emerald-500 rounded-[1.5rem] transition-all text-white shadow-xl shadow-emerald-500/20 active:scale-90"
                          title="Guardar em Memória"
                        >
                          <CheckCircle2 size={24} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 mb-2">
                      <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-6">
                        <h3 className="text-7xl md:text-[8rem] font-black tracking-tighter leading-none italic">
                          <span className="text-3xl md:text-5xl align-top mr-2 not-italic text-white/50">R$</span>
                          {results.finalPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <div className={`inline-flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-xl border-4 uppercase skew-x-[-12deg] mb-4 md:mb-8 ${results.verdict === 'PECHINCHA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : results.verdict === 'ACEITÁVEL' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                           {results.verdict}
                        </div>
                      </div>
                    </div>

                    <div className="backdrop-blur-sm bg-white/5 rounded-[2rem] p-4 border border-white/5 shadow-2xl mb-12">
                      <PriceChart 
                        data={data.history || []} 
                        color={results.verdict === 'PECHINCHA' ? '#10b981' : results.verdict === 'ACEITÁVEL' ? '#f59e0b' : '#f43f5e'} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-16 pt-10 border-t-4 border-white/5">
                      <div className="space-y-2">
                        <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em] italic">Margem Terminal</p>
                        <p className={`text-5xl md:text-6xl font-black tracking-tighter ${results.margin > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {results.margin > 0 ? '+' : ''}{results.margin.toFixed(2)}%
                        </p>
                      </div>
                      <div className="space-y-2 text-right">
                        <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em] italic">Preço de Mercado</p>
                        <p className="text-5xl md:text-6xl font-black tracking-tighter text-white">
                          <span className="text-xl mr-1 text-white/30">R$</span>
                          {data.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation Table & Status */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-10 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                    <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-8 tracking-[0.4em] flex items-center gap-2">
                      <BarChart3 size={14} /> Logaritmo de Venda
                    </h2>
                    <div className="space-y-6 font-mono font-bold">
                      {data.type === 'acoes' ? (
                        <>
                          <div className="flex justify-between items-center group/item">
                            <span className="text-slate-400 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">EST MÉTODO GRAHAM</span>
                            <span className="text-xl text-slate-900 dark:text-slate-100">R$ {results.graham?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center group/item">
                            <span className="text-slate-400 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">PROJEÇÃO P/L ALVO</span>
                            <span className="text-xl text-slate-900 dark:text-slate-100">R$ {results.plTarget?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center group/item">
                            <span className="text-slate-400 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">BALANÇO P/VP ALVO</span>
                            <span className="text-xl text-slate-900 dark:text-slate-100">R$ {results.pvpTarget?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center hover:scale-105 transition-transform">
                            <span className="text-emerald-500 text-sm font-black italic">MÉTODO BAZIN</span>
                            <span className="text-2xl text-emerald-600 dark:text-emerald-400">R$ {results.bazin?.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-8">
                           <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">PREÇO TETO FII</span>
                            <span className="text-3xl text-slate-900 dark:text-slate-100 italic">R$ {results.fiiPt?.toFixed(2)}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 space-y-2">
                             <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest italic">Fórmula Aplicada:</p>
                             <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                               (Rend. Mensal × 12) ÷ ((Benchmark + Spread) / 100)
                             </p>
                             <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2 text-[10px] text-slate-400 font-medium">
                               Taxa Alvo Final: <span className="text-slate-600 dark:text-slate-300 font-bold">{( (data.benchmark || 0) + (data.spread || 0) ).toFixed(2)}% a.a</span>
                             </div>
                             {data.vacancia !== undefined && data.vacancia > 10 && (
                               <div className="flex items-center gap-2 text-[10px] text-rose-500 font-black uppercase italic mt-1">
                                 <AlertTriangle size={10} /> Alerta: Vacância Elevada ({data.vacancia}%)
                               </div>
                             )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-10 shadow-2xl flex flex-col justify-center items-center text-center group hover:border-emerald-500/50 transition-colors">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                      <div className="relative w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-5xl shadow-2xl group-hover:rotate-[360deg] transition-transform duration-1000">
                        🤖
                      </div>
                    </div>
                    <p className="font-black text-2xl text-slate-900 dark:text-slate-100 italic tracking-tighter">Analista Terminal</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.4em] mt-2 italic">Neural Kernel v10.4</p>
                    <div className="mt-8 w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: "circOut" }} className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                       <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black tracking-[0.2em] uppercase">Sincronização OK</p>
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </main>

        {/* History Section */}
        {saved.length > 0 && (
          <section className="mt-12 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-4 h-0.5 bg-slate-300 dark:bg-slate-700" />
                Histórico de Consultas ({saved.length})
              </h3>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={shareAllSaved}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${copySuccess === 'all' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {copySuccess === 'all' ? <CheckCircle2 size={14} /> : <Share2 size={14} />}
                  {copySuccess === 'all' ? 'Copiado!' : 'Compartilhar Tudo'}
                </button>
                <button 
                  onClick={downloadAllSaved}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
                >
                  <Download size={14} />
                  Baixar Relatório Completo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {saved.map((item, idx) => (
                <motion.div 
                  key={item.id} 
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.ticker}</span>
                        <span className="text-[10px] font-black px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full uppercase tracking-widest leading-none">{item.type}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-bold italic tracking-wider">{item.date}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <button 
                        onClick={() => shareAnalysis(item)}
                        className={`p-3 rounded-2xl transition-all shadow-lg ${copySuccess === item.id ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-emerald-500'}`}
                        title="Copiar Relatório"
                      >
                        {copySuccess === item.id ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
                      </button>
                      <button 
                        onClick={() => downloadTextFile(item)}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-lg"
                        title="Download .txt"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => deleteSaved(item.id)}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-300 hover:text-rose-500 transition-all shadow-lg"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-50 dark:border-slate-800/50">
                    <div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.2em] mb-2 italic">Preço Teto</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                        <span className="text-xs text-slate-400 font-bold mr-1">R$</span>
                        {item.targetPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.2em] mb-2 italic">Veredito</p>
                      <p className={`text-sm font-black italic uppercase leading-none skew-x-[-12deg] ${item.verdictColor}`}>
                        {item.verdict}
                      </p>
                      <p className={`text-[11px] font-black mt-2 inline-block px-2 py-0.5 rounded-md ${item.margin > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {item.margin > 0 ? '+' : ''}{item.margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar visual indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.max(item.margin, 0), 100)}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.1)] ${item.margin > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-auto flex flex-col md:flex-row justify-between items-center py-8 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase gap-4">
          <p>© 2026 ANALISTA TERMINAL ROBÓTICO // [SESSION: {Math.random().toString(36).substr(2, 9).toUpperCase()}]</p>
          <div className="flex gap-6">
            <span>API Status: ONLINE</span>
            <span>DATA FEED: REAL-TIME</span>
            {data && <span className="text-slate-500 dark:text-slate-400">SYMBOL: {data.ticker}</span>}
          </div>
        </footer>
      </div>
    </div>
  );
}
