"use client";

import { createContext, useActionState, useContext, useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/server/web/action-state";

/*
 * Forms post to server actions and work without JavaScript; with JavaScript they show pending
 * state and inline errors. Errors are announced to assistive technology.
 */

export function SubmitButton({
  children,
  variant = "primary",
  size,
  pendingText = "Working…",
  block,
  name,
  value,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "sage" | "quiet";
  size?: "sm";
  pendingText?: string;
  block?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn btn-${variant}${size ? " btn-sm" : ""}${block ? " btn-block" : ""}`}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      name={name}
      value={value}
    >
      {pending ? pendingText : children}
    </button>
  );
}

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** The latest action result for the enclosing form; fields read their error and echoed value from it. */
const FormStateContext = createContext<ActionState>({});
export const useFormResult = () => useContext(FormStateContext);

function useFieldState(
  name: string,
  error: string | undefined,
  defaultValue: string | string[] | undefined,
) {
  const state = useContext(FormStateContext);
  const echoed = state.values?.[name];
  return {
    error: error ?? state.fieldErrors?.[name],
    value: echoed !== undefined ? echoed : defaultValue,
  };
}
const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * React resets uncontrolled forms after every action, so the form re-mounts keyed on state.at and
 * each field restores what the user typed (state.values) and shows its error (state.fieldErrors).
 */
export function ActionForm({
  action,
  children,
  className = "form",
  id,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  /** Ignored: React sets multipart encoding itself for function actions (and warns if it is passed). */
  encType?: "multipart/form-data";
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <FormStateContext.Provider value={state}>
      <form
        action={formAction}
        className={className}
        noValidate
        key={state.at}
        id={id}
      >
        <FormMessages state={state} />
        {children}
      </form>
    </FormStateContext.Provider>
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

function FieldShell({
  id,
  label,
  hint,
  required,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={`field${error ? " err" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="errmsg" id={`${id}-err`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;

export function TextField(
  props: FieldProps & {
    type?: string;
    defaultValue?: string;
    autoComplete?: string;
    maxLength?: number;
    inputMode?: "numeric" | "text" | "email" | "tel";
    placeholder?: string;
    min?: string;
    max?: string;
    pattern?: string;
  },
) {
  const id = useId();
  const {
    name,
    required,
    hint,
    type = "text",
    autoComplete,
    maxLength,
    inputMode,
    placeholder,
    min,
    max,
    pattern,
  } = props;
  const { error, value } = useFieldState(
    name,
    props.error,
    type === "password" ? undefined : props.defaultValue,
  );
  return (
    <FieldShell {...props} error={error} id={id}>
      <input
        id={id}
        name={name}
        type={type}
        className="input"
        defaultValue={asString(value)}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        min={min}
        max={max}
        pattern={pattern}
      />
    </FieldShell>
  );
}

export function TextArea(
  props: FieldProps & { defaultValue?: string; maxLength?: number; rows?: number },
) {
  const id = useId();
  const { name, required, hint, maxLength, rows } = props;
  const { error, value } = useFieldState(name, props.error, props.defaultValue);
  return (
    <FieldShell {...props} error={error} id={id}>
      <textarea
        id={id}
        name={name}
        className="textarea"
        defaultValue={asString(value)}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        maxLength={maxLength}
        rows={rows}
      />
    </FieldShell>
  );
}

export function SelectField(
  props: FieldProps & {
    options: { value: string; label: string }[];
    defaultValue?: string;
    placeholder?: string;
  },
) {
  const id = useId();
  const { name, required, hint, options, placeholder } = props;
  const { error, value } = useFieldState(name, props.error, props.defaultValue);
  return (
    <FieldShell {...props} error={error} id={id}>
      <select
        id={id}
        name={name}
        className="select"
        defaultValue={asString(value) ?? ""}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
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

export function ChoiceGroup({
  name,
  legend,
  hint,
  options,
  type = "radio",
  defaultValue,
  required,
  error: errorProp,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  options: { value: string; label: ReactNode; description?: ReactNode }[];
  type?: "radio" | "checkbox";
  defaultValue?: string | string[];
  required?: boolean;
  error?: string;
}) {
  const id = useId();
  const { error, value } = useFieldState(name, errorProp, defaultValue);
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  return (
    <fieldset
      aria-describedby={describedBy(id, hint, error)}
      aria-invalid={error ? true : undefined}
      className={error ? "field err" : undefined}
    >
      <legend>
        {legend}
        {required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      <div className="choices">
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input
              type={type}
              name={name}
              value={o.value}
              defaultChecked={selected.has(o.value)}
              required={type === "radio" ? required : undefined}
            />
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

export function Checkbox({
  name,
  children,
  defaultChecked,
  required,
  value = "on",
  error: errorProp,
}: {
  name: string;
  children: ReactNode;
  defaultChecked?: boolean;
  required?: boolean;
  value?: string;
  error?: string;
}) {
  const id = useId();
  const state = useContext(FormStateContext);
  const error = errorProp ?? state.fieldErrors?.[name];
  if (state.values) defaultChecked = state.values[name] !== undefined;
  return (
    <div className={`field${error ? " err" : ""}`}>
      <label className="check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
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
  const {
    name,
    required,
    hint,
    accept = "application/pdf,image/png,image/jpeg,image/heic",
  } = props;
  const { error } = useFieldState(name, props.error, undefined);
  return (
    <FieldShell {...props} error={error} id={id}>
      <input
        id={id}
        name={name}
        type="file"
        className="file-input"
        accept={accept}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
    </FieldShell>
  );
}
