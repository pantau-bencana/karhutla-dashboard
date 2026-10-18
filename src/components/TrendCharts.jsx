import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAngka, formatTanggal, formatTanggalPendek } from "../lib/format.js";
import { shortName } from "../lib/geo.js";
import { ISPU_EXPLANATION } from "../lib/ispuView.js";

const SERIES_COLORS = {
  Riau: "#b42318",
  Jambi: "#9a3412",
  "Sumatera Selatan": "#c2410c",
  "Kalimantan Barat": "#1d4e89",
  "Kalimantan Tengah": "#0f766e",
  "Kalimantan Selatan": "#6d28d9",
  "Kalimantan Timur": "#0369a1",
  "Sumatera Utara": "#3f6212",
  "Nusa Tenggara Timur": "#a16207",
  Lainnya: "#78716c",
};

function colorFor(name, index) {
  return SERIES_COLORS[name] ?? ["#1d4e89", "#0f766e", "#a16207", "#6d28d9"][index % 4];
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <strong>{formatTanggal(label)}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          {shortName(item.dataKey)}: {item.value == null ? "—" : formatAngka(item.value)}
          {unit}
        </div>
      ))}
    </div>
  );
}

export function TrendCharts({ hotspotTrend, hotspotSeries, province }) {
  return (
    <section className="charts">
      <article className="card">
        <header className="card-head">
          <h2>Tren titik panas harian</h2>
          <p>
            {province
              ? `Jumlah deteksi per hari di ${province}.`
              : "Enam provinsi prioritas. Provinsi lain digabung sebagai Lainnya."}
          </p>
        </header>
        {hotspotTrend.length && hotspotSeries.length ? (
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={hotspotTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e6e0d4" />
                <XAxis dataKey="tanggal" tickFormatter={formatTanggalPendek} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} width={36} tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip unit=" titik" />} />
                <Legend formatter={(value) => shortName(value)} />
                {hotspotSeries.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={colorFor(name, index)}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray={name === "Lainnya" ? "5 4" : undefined}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty">Tidak ada titik panas pada rentang ini.</p>
        )}
      </article>

      <article className="card">
        <header className="card-head">
          <h2>Kualitas Udara (ISPU)</h2>
          <p>Lapisan stasiun di dalam Karhutla. Bukan grafik dari data contoh.</p>
        </header>
        <div className="logic-body">
          <p>{ISPU_EXPLANATION}</p>
          <p className="fine">Stasiun resmi belum terhubung. Angka contoh ISPU tidak digambar di sini.</p>
        </div>
      </article>
    </section>
  );
}
