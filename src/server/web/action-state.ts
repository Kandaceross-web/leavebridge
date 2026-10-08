/** Serializable result of a form server action. Shared by client form components. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every submit; forms use it as a key to re-mount with submitted values. */
  at?: number;
  /** Arbitrary small payload for the page (never PHI beyond what the user just typed). */
  data?: Record<string, unknown>;
  /** Submitted text values, echoed back on error so fields keep what the user typed. */
  values?: Record<string, string | string[]>;
}
