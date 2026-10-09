import { KeyValue } from "@/components/ui";
import { estimateSections, type EstimateContent } from "@/domain/payments/good-faith-estimate";

/**
 * The written Good Faith Estimate exactly as stored (45 CFR 149.610). Used on the checkout step
 * and on the printable estimate page; `level` keeps headings in order under either page's h1/h2.
 */
export function EstimateBody({ content, hash, level }: { content: EstimateContent; hash: string; level: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  const s = estimateSections(content);
  const kv = (lines: { label: string; value: string }[]) => <KeyValue items={lines.map((l) => [l.label, l.value])} />;
  return (
    <div className="stack" data-testid="good-faith-estimate">
      <div className="stack stack-sm">
        <H>Patient</H>
        {kv(s.patient)}
      </div>
      <div className="stack stack-sm">
        <H>Service</H>
        {kv(s.service)}
      </div>
      <div className="stack stack-sm">
        <H>Expected items and charges</H>
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Expected items and charges">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Item or service</th>
                <th scope="col">Service code</th>
                <th scope="col">Quantity</th>
                <th scope="col">Expected charge</th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((i) => (
                <tr key={i.description}>
                  <td>{i.description}</td>
                  <td className="mono">{i.serviceCode}</td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">{i.charge}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>
                  Total expected charges
                </th>
                <td className="num">
                  <b>{s.total}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {kv([{ label: "Diagnosis codes", value: s.diagnosisCodes }])}
      </div>
      <div className="stack stack-sm">
        <H>Provider</H>
        {kv(s.provider)}
      </div>
      <div className="stack stack-sm">
        <H>Please read</H>
        <ul className="list-plain small stack stack-sm">
          {content.disclaimers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="small">
          Dispute resolution information: <a href={content.disputeUrl}>{content.disputeUrl.replace(/^https?:\/\//, "")}</a>
        </p>
      </div>
      {kv([...s.record, { label: "Record hash", value: hash.slice(0, 16) }])}
    </div>
  );
}
