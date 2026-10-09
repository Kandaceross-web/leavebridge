// FMLA basics check for the static site. Answers stay in this page: nothing is sent, stored or tracked.
(() => {
  const RESULTS = {"likely":{"card":"card-mint","title":"FMLA may apply to your job","body":"Your answers match the basic FMLA eligibility rules. Your employer or leave administrator makes the final decision, and FMLA leave also needs a serious health condition supported by medical certification."},"unsure":{"card":"card-sun","title":"Check the details with HR","body":"Your HR team or leave administrator can tell you your months and hours of service and whether your worksite meets the 50-employee rule."},"unlikely":{"card":"card-lavender","title":"FMLA may not apply, but you may still have options","body":"Your employer’s own leave policy, short-term disability coverage, or a workplace accommodation may still help. Ask HR what applies to you."}};
  const result = function basicsResult(values){return values.includes("no")?"unlikely":values.includes("unsure")?"unsure":"likely"};
  const root = document.querySelector("[data-basics-check]");
  if (!root) return;
  const out = root.querySelector("[data-basics-result]");
  const names = [...new Set([...root.querySelectorAll("input[type=radio]")].map((i) => i.name))];
  root.addEventListener("change", () => {
    const values = names.map((n) => root.querySelector("input[name='" + n + "']:checked")?.value);
    out.replaceChildren();
    if (values.some((v) => !v)) return;
    const r = RESULTS[result(values)];
    const card = document.createElement("div");
    card.className = "card " + r.card + " stack stack-sm";
    const h = document.createElement("h2");
    h.textContent = r.title;
    const p = document.createElement("p");
    p.textContent = r.body;
    card.append(h, p);
    out.append(card);
  });
})();
