import "server-only";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { env } from "../env";

/**
 * Replaceable AI drafting assistance. Guardrails live in the caller (documents service), not in
 * the vendor adapter: every suggestion must cite record sources that exist, is stored as a
 * DRAFT that a clinician accepts field by field, and can never produce a signed version or a
 * clinical determination. Default provider is "disabled". Any production provider must be
 * covered by a BAA with zero data retention and no training on inputs (LEG-06, SEC-04).
 */
export interface RecordSource {
  ref: string;
  label: string;
  text: string;
}

export interface FieldSpec {
  key: string;
  label: string;
}

export interface RawSuggestion {
  fieldKey: string;
  text: string;
  sourceRefs: string[];
}

export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  suggestFields(fields: FieldSpec[], sources: RecordSource[]): Promise<RawSuggestion[]>;
}

class DisabledProvider implements AiProvider {
  readonly name = "disabled";
  readonly enabled = false;
  async suggestFields(): Promise<RawSuggestion[]> {
    return [];
  }
}

/**
 * Deterministic development stub. It only quotes record text verbatim, matched by keyword, so the
 * end-to-end guardrails can be exercised without sending data anywhere.
 */
class StubProvider implements AiProvider {
  readonly name = "stub";
  readonly enabled = true;
  async suggestFields(fields: FieldSpec[], sources: RecordSource[]): Promise<RawSuggestion[]> {
    const out: RawSuggestion[] = [];
    for (const f of fields) {
      const words = f.label.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const match = sources.find((s) => words.some((w) => s.label.toLowerCase().includes(w)) && s.text.trim());
      if (match) out.push({ fieldKey: f.key, text: match.text.slice(0, 600), sourceRefs: [match.ref] });
    }
    return out;
  }
}

class BedrockProvider implements AiProvider {
  readonly name = "bedrock";
  readonly enabled = true;
  private client = new BedrockRuntimeClient({});
  constructor(private readonly modelId: string) {}
  async suggestFields(fields: FieldSpec[], sources: RecordSource[]): Promise<RawSuggestion[]> {
    const system =
      "You help a licensed clinician draft form fields. Use ONLY facts stated in the provided record sources. " +
      "Never invent symptoms, dates, diagnoses, limitations, frequencies, durations, treatment or findings. " +
      "If the sources do not support a field, omit it. Respond with JSON: " +
      '{"suggestions":[{"fieldKey":string,"text":string,"sourceRefs":[string]}]}';
    const user = JSON.stringify({ fields, sources });
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: system }],
        messages: [{ role: "user", content: [{ text: user }] }],
        inferenceConfig: { temperature: 0, maxTokens: 2000 },
      }),
    );
    const text = res.output?.message?.content?.map((c) => ("text" in c ? c.text : "")).join("") ?? "";
    try {
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { suggestions?: RawSuggestion[] };
      return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    } catch {
      return [];
    }
  }
}

export function aiProvider(): AiProvider {
  switch (env.AI_PROVIDER) {
    case "stub":
      return new StubProvider();
    case "bedrock":
      return new BedrockProvider(env.BEDROCK_MODEL_ID ?? "");
    default:
      return new DisabledProvider();
  }
}
