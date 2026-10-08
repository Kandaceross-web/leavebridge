"use client";

import { useActionState, useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/server/web/action-state";

/*
 * Forms post to server actions and work without JavaScript; with JavaScript they show pending
 * state and inline errors. Errors are announced to assistive technology.
 */

export function SubmitButton({ children, variant = "primary", size, pendingText = "Working…", block, name, value, disabled }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "sage" | "quiet"; size?: "sm"; pendingText?: string; block?: boolean; name?: string; value?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant}${size ? " btn-sm" : ""}${block ? " btn-block" : ""}`} disabled={pending || disabled} aria-disabled={pending || disabled} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * React resets uncontrolled forms after every action, so the form re-mounts keyed on state.at and
 * render functions can restore what the user typed from state.values on error.
 */
export function ActionForm({ action, children, className = "form", encType }: { action: Action; children: ReactNode | ((state: ActionState) => ReactNode); className?: string; encType?: "multipart/form-data" }) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className={className} encType={encType} noValidate key={state.at}>
      <FormMessages state={state} />
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}

export function FormMessages({ state }: { state: ActionState }) {
  return (
    <div aria-live="polite" className="stack stack-sm">
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.ok && state.message ? <div className="form-success">{state.message}</div> : null}
    </div>
  );
}

interface FieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  error?: string;
}

function FieldShell({ id, label, hint, required, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={`field${error ? " err" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true">*</span> : null}
      </label>
      {hint ? <p className="hint" id={`${id}-hint`}>{hint}</p> : null}
      {children}
      {error ? (
        <p className="errmsg" id={`${id}-err`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) => [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;

export function TextField(props: FieldProps & { type?: string; defaultValue?: string; autoComplete?: string; maxLength?: number; inputMode?: "numeric" | "text" | "email" | "tel"; placeholder?: string; min?: string; max?: string; pattern?: string }) {
  const id = useId();
  const { name, required, error, hint, type = "text", defaultValue, autoComplete, maxLength, inputMode, placeholder, min, max, pattern } = props;
  return (
    <FieldShell {...props} id={id}>
      <input id={id} name={name} type={type} className="input" defaultValue={defaultValue} required={required} aria-required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode} placeholder={placeholder} min={min} max={max} pattern={pattern} />
    </FieldShell>
  );
}

export function TextArea(props: FieldProps & { defaultValue?: string; maxLength?: number; rows?: number }) {
  const id = useId();
  const { name, required, error, hint, defaultValue, maxLength, rows } = props;
  return (
    <FieldShell {...props} id={id}>
      <textarea id={id} name={name} className="textarea" defaultValue={defaultValue} required={required} aria-required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} maxLength={maxLength} rows={rows} />
    </FieldShell>
  );
}

export function SelectField(props: FieldProps & { options: { value: string; label: string }[]; defaultValue?: string; placeholder?: string }) {
  const id = useId();
  const { name, required, error, hint, options, defaultValue, placeholder } = props;
  return (
    <FieldShell {...props} id={id}>
      <select id={id} name={name} className="select" defaultValue={defaultValue ?? ""} required={required} aria-required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function ChoiceGroup({ name, legend, hint, options, type = "radio", defaultValue, required, error }: { name: string; legend: ReactNode; hint?: ReactNode; options: { value: string; label: ReactNode; description?: ReactNode }[]; type?: "radio" | "checkbox"; defaultValue?: string | string[]; required?: boolean; error?: string }) {
  const id = useId();
  const selected = new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  return (
    <fieldset aria-describedby={describedBy(id, hint, error)} aria-invalid={error ? true : undefined} className={error ? "field err" : undefined}>
      <legend>
        {legend}
        {required ? <span className="req" aria-hidden="true">*</span> : null}
      </legend>
      {hint ? <p className="hint" id={`${id}-hint`}>{hint}</p> : null}
      <div className="choices">
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type={type} name={name} value={o.value} defaultChecked={selected.has(o.value)} required={type === "radio" ? required : undefined} />
            <div>
              <b>{o.label}</b>
              {o.description ? <span>{o.description}</span> : null}
            </div>
          </label>
        ))}
      </div>
      {error ? (
        <p className="errmsg" id={`${id}-err`}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function Checkbox({ name, children, defaultChecked, required, value = "on", error }: { name: string; children: ReactNode; defaultChecked?: boolean; required?: boolean; value?: string; error?: string }) {
  const id = useId();
  return (
    <div className={`field${error ? " err" : ""}`}>
      <label className="check" htmlFor={id}>
        <input id={id} type="checkbox" name={name} value={value} defaultChecked={defaultChecked} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
        <span>{children}</span>
      </label>
      {error ? (
        <p className="errmsg" id={`${id}-err`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FileField(props: FieldProps & { accept?: string }) {
  const id = useId();
  const { name, required, error, hint, accept = "application/pdf,image/png,image/jpeg,image/heic" } = props;
  return (
    <FieldShell {...props} id={id}>
      <input id={id} name={name} type="file" className="file-input" accept={accept} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} />
    </FieldShell>
  );
}
