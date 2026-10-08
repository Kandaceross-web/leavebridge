"use client";

import { useId, useState } from "react";
import { useFormResult } from "@/components/forms";

export interface CredentialOption {
  id: string;
  basis: "license" | "compact_privilege";
  state: string;
  label: string;
}

/**
 * State, basis and credential for a new service authorization. The credential list is filtered
 * to the chosen state and basis; the server re-checks that the credential matches both.
 */
export function CredentialPicker({ credentials, stateNames }: { credentials: CredentialOption[]; stateNames: Record<string, string> }) {
  const res = useFormResult();
  const echoed = (k: string) => {
    const v = res.values?.[k];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const [state, setState] = useState(echoed("jurisdictionCode"));
  const [basis, setBasis] = useState(echoed("basis") || "license");
  const ids = { state: useId(), basis: useId(), cred: useId() };
  const states = [...new Set(credentials.map((c) => c.state))].sort();
  const matching = credentials.filter((c) => (!state || c.state === state) && c.basis === basis);
  const err = (k: string) => res.fieldErrors?.[k];
  return (
    <>
      <div className={`field${err("jurisdictionCode") ? " err" : ""}`}>
        <label htmlFor={ids.state}>
          State<span className="req" aria-hidden="true">*</span>
        </label>
        <p className="hint" id={`${ids.state}-hint`}>
          Only states where this clinician holds a recorded license or privilege are listed.
        </p>
        <select id={ids.state} name="jurisdictionCode" className="select" required aria-required value={state} onChange={(e) => setState(e.target.value)} aria-describedby={`${ids.state}-hint`}>
          <option value="">Choose a state</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {stateNames[s] ?? s} ({s})
            </option>
          ))}
        </select>
        {err("jurisdictionCode") ? <p className="errmsg">{err("jurisdictionCode")}</p> : null}
      </div>
      <fieldset>
        <legend>
          Basis<span className="req" aria-hidden="true">*</span>
        </legend>
        <div className="choices choices-inline">
          {(["license", "compact_privilege"] as const).map((b) => (
            <label key={b} className="choice">
              <input type="radio" name="basis" value={b} checked={basis === b} onChange={() => setBasis(b)} />
              <div>
                <b>{b === "license" ? "State license" : "Compact privilege"}</b>
              </div>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={`field${err("credentialId") ? " err" : ""}`}>
        <label htmlFor={ids.cred}>
          Credential<span className="req" aria-hidden="true">*</span>
        </label>
        <select id={ids.cred} name="credentialId" className="select" required aria-required key={`${state}-${basis}`} defaultValue={echoed("credentialId")}>
          <option value="">{matching.length ? "Choose a credential" : "No matching credential for this state and basis"}</option>
          {matching.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {err("credentialId") ? <p className="errmsg">{err("credentialId")}</p> : null}
      </div>
    </>
  );
}
