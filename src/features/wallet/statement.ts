import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatINR } from '@/lib/money';
import type { WalletSummary } from './api';

function labelFor(ref: string): string {
  if (ref.startsWith('sale:')) return 'Sale commission';
  if (ref.startsWith('withdrawal:')) return 'Withdrawal';
  if (ref.startsWith('bonus:')) return 'Bonus';
  return ref;
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);

/**
 * Build a commission/earnings statement PDF (TDS/tax-ready) and open the share
 * sheet. Pure presentation — amounts come straight from the wallet summary.
 */
export async function exportCommissionStatement(summary: WalletSummary, agentName: string) {
  const now = new Date();
  const rows = summary.ledger
    .map((e) => {
      const credit = e.direction === 'credit';
      return `<tr>
        <td>${new Date(e.created_at).toLocaleDateString('en-IN')}</td>
        <td>${esc(labelFor(e.source_ref))}</td>
        <td>${esc(e.status)}</td>
        <td class="amt" style="color:${credit ? '#1a7f4b' : '#c0392b'}">${credit ? '+' : '−'}${esc(formatINR(e.amount))}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1a1a1a;padding:28px}
    h1{font-size:20px;margin:0 0 2px} .sub{color:#777;font-size:12px;margin-bottom:18px}
    .cards{display:flex;gap:12px;margin-bottom:18px}
    .card{flex:1;border:1px solid #e6e7e2;border-radius:10px;padding:12px}
    .card .l{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999}
    .card .v{font-size:20px;font-weight:700;font-family:monospace}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{text-align:left;padding:8px;border-bottom:1px solid #eee}
    .amt{text-align:right;font-family:monospace;white-space:nowrap}
    .foot{margin-top:22px;color:#999;font-size:10px}
  </style></head><body>
    <h1>JAMIN Properties — Commission Statement</h1>
    <div class="sub">${esc(agentName)} · generated ${now.toLocaleString('en-IN')}</div>
    <div class="cards">
      <div class="card"><div class="l">Wallet balance</div><div class="v">${esc(formatINR(summary.balance))}</div></div>
      <div class="card"><div class="l">Lifetime earnings</div><div class="v">${esc(formatINR(summary.earnings))}</div></div>
    </div>
    <table><thead><tr><th>Date</th><th>Description</th><th>Status</th><th class="amt">Amount</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">No transactions.</td></tr>'}</tbody></table>
    <div class="foot">This is a system-generated statement for record-keeping. Consult your accountant for tax/TDS filing.</div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Commission statement' });
  }
}
