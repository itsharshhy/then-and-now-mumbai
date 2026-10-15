"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedReports, summarise, type ReportSummary } from "@/lib/bazaar";
import { LAST_YEAR, rupees, type Item } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase";

function useSummaries() {
  const [s, setS] = useState<ReportSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured()) return setFailed(true);
    let live = true;
    cachedReports()
      .then((r) => live && setS(summarise(r)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { s, failed };
}

/** One line in a shop: what players paid recently, or an invitation to report. */
export function ShopReports({ item }: { item: Item }) {
  const { s, failed } = useSummaries();
  if (failed) return null;
  const mine = s?.find((x) => x.item.id === item.id);
  return (
    <p className="shop-live">
      {s === null ? (
        "Checking what players paid lately…"
      ) : mine ? (
        <>
          <b>Players paid {rupees(mine.median)}</b> lately (median of {mine.count} reviewed report{mine.count === 1 ? "" : "s"}, last 90 days).{" "}
        </>
      ) : (
        "No player reports for this yet. "
      )}
      <Link href={`/bazaar/?report=${item.id}`}>Report what you paid</Link>
    </p>
  );
}

/** Analyst Mode table: live reports next to the dataset's latest figure. */
export function AnalystReports() {
  const { s, failed } = useSummaries();
  if (failed) return <p className="an-intro">Live reports aren&apos;t available on this copy of the site.</p>;
  if (s === null) return <p className="an-intro">Loading live reports…</p>;
  if (!s.length)
    return (
      <p className="an-intro">
        No reviewed player reports in the last 90 days yet. <Link href="/bazaar/?report=vadapav">Report a price</Link>.
      </p>
    );
  return (
    <div className="lr-wrap">
      <table className="lr-table">
        <caption>Reviewed player reports, last 90 days, next to the dataset&apos;s {LAST_YEAR} figure</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Reports</th>
            <th scope="col">Median paid</th>
            <th scope="col">Range</th>
            <th scope="col">Dataset {LAST_YEAR}</th>
          </tr>
        </thead>
        <tbody>
          {s.map((x) => (
            <tr key={x.item.id}>
              <th scope="row">
                {x.item.name} <small>{x.item.unit}</small>
              </th>
              <td>{x.count}</td>
              <td>{rupees(x.median)}</td>
              <td>{x.count > 1 ? `${rupees(x.low)}–${rupees(x.high)}` : "–"}</td>
              <td>{rupees(x.datasetNow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
