import express from "express";
import { createServer as createViteServer } from "vite";
import yahooFinance from "yahoo-finance2";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger for debugging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // API Route for Ticker Data using Yahoo Finance
  app.get("/api/ticker/:type/:ticker", async (req, res) => {
    const { ticker } = req.params;
    // Append .SA for Brazilian stocks if not already present
    const symbol = ticker.includes(".") ? ticker.toUpperCase() : `${ticker.toUpperCase()}.SA`;

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      // Fetch quote (real-time), summary (fundamentals), and historical dividends (true LTM)
      const [result, quote, historicalDivs, chartResult] = await Promise.all([
        yahooFinance.quoteSummary(symbol, {
          modules: ["price", "defaultKeyStatistics", "summaryDetail", "financialData"]
        }),
        yahooFinance.quote(symbol),
        yahooFinance.historical(symbol, { 
          period1: oneYearAgoStr,
          events: 'div' 
        }).catch(() => []),
        yahooFinance.chart(symbol, {
          period1: oneYearAgoStr,
          interval: '1d'
        }).catch(() => null)
      ]);

      if (!result || !result.price) {
        return res.status(404).json({ error: "Ativo não encontrado ou API indisponível no momento." });
      }

      const priceData = result.price;
      const stats = result.defaultKeyStatistics;
      const summary = result.summaryDetail;
      const financial = result.financialData;

      // Real-time price from quote endpoint
      const price = quote?.regularMarketPrice || priceData.regularMarketPrice || summary?.previousClose || 0;
      
      // Fundamentals
      const vpa = stats?.bookValue || 0;
      const lpa = stats?.trailingEps || 0;
      const roe = (financial?.returnOnEquity || 0) * 100;

      // Dividends logic: Try multiple Yahoo sources for LTM Dividends
      const dyRaw = summary?.dividendYield || summary?.trailingAnnualDividendYield || 0;
      const divRateRaw = summary?.dividendRate || summary?.trailingAnnualDividendRate || 0;
      
      // Calculate LTM Dividends by summing history
      const ltmDividendsSum = Array.isArray(historicalDivs) 
        ? historicalDivs.reduce((acc: number, cur: any) => acc + (cur.dividends || 0), 0)
        : 0;

      // Source of truth for dividends: If sum exists, use it. Otherwise use the rate field.
      // BBAS3 in Yahoo often has info in summaryDetail even if historical fails.
      const ltmDividends = ltmDividendsSum > 0 ? ltmDividendsSum : divRateRaw;

      // Final DY calculation: prefer summaryDetail's consolidated yield, fallback to manual calc
      const dyPercent = dyRaw > 0 ? dyRaw * 100 : (price > 0 ? (ltmDividends / price) * 100 : 0);

      // Format chart data
      const history = chartResult?.quotes?.map((q: any) => ({
        date: q.date.toISOString().split('T')[0],
        price: q.close
      })).filter((q: any) => q.price != null) || [];

      // Response object
      const response: any = {
        ticker: ticker.toUpperCase(),
        type: req.params.type,
        price,
        vpa,
        lpa,
        dy: dyPercent,
        dividendsLtmValue: ltmDividends,
        dividends12m: ltmDividends, 
        roe,
        history,
        pvp: quote?.priceToBook || summary?.priceToBook || (vpa > 0 ? price / vpa : 0),
        name: quote?.longName || priceData.longName || priceData.shortName || ticker.toUpperCase()
      };

      res.json(response);
    } catch (error: any) {
      console.error(`Error fetching ticker ${symbol}:`, error.message);
      res.status(500).json({ error: "Erro ao conectar com a API de dados financeiros." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
