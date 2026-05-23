# The Wishlist

**A spreadsheet your council comes back to.**
*Companion to Part 2 of the Commons Kit — BLKOUT UK*

---

## What it is

A working log of every tool, partnership, platform, or capability your organisation is considering — plus the council's verdict on each, and your decision afterwards. One row per item. The wishlist is what keeps ideas from getting lost between conversations, and what gives the council something concrete to evaluate.

The kit ships with [`wishlist-template.csv`](/kit/wishlist-template.csv) — twelve columns, three sample rows showing the three states (decided, pending, shelved). Open it in any spreadsheet app (Sheets, Excel, Numbers), make a copy, fill in your own.

---

## What goes on it

Anything that would require an organisational decision:

- A tool or platform that's been pitched at you
- A partnership offer
- A capability you've identified as a gap in your stack
- An infrastructure decision (hosting, payments, comms, CRM)
- A funder relationship under consideration
- A platform a peer org is using that you're curious about

If the answer would change something material about how your org operates, it belongs on the wishlist.

---

## The columns

| Column | What it holds |
|---|---|
| `id` | sequential number or your own naming |
| `date_logged` | when added to the wishlist (YYYY-MM-DD) |
| `item` | name of the tool, partnership, platform, capability |
| `why_considering` | the gap or pressure that prompted the entry |
| `cost` | money + time + dependency depth + switching cost |
| `decision_by` | date or trigger; `no_rush` is a valid answer |
| `status` | `pending` / `council_done` / `decided` / `shelved` |
| `council_verdict` | `Adopt` / `Adopt with Conditions` / `Decline` / `Split` |
| `council_summary` | paste the council summary from Part 2's meta-prompt output |
| `your_decision` | `Adopt` / `Adopt with Conditions` / `Decline` / `Postponed` |
| `decision_date` | YYYY-MM-DD when you logged the decision |
| `notes` | conditions, review dates, anything else |

---

## How to prioritise

Items that should rise to the top — run them through the council sooner:

- **External deadline pressing** — a vendor needs an answer this quarter
- **Unblocks other decisions** — picking a CRM unlocks the events platform question
- **Cost of wrong decision is high** — switching is expensive, dependency is deep, you can't easily reverse
- **Pitched at you twice** — recurring conversations signal real need rather than passing curiosity

Items that can stay at the bottom — or be shelved:

- Nice-to-have tools where no one's actually asked for them
- Anything you'd happily forget about for six months
- Capabilities that would require headcount you don't currently have

Shelving without a council pass is a valid move. Mark it `shelved`, note why, set a review date. The wishlist's job is to keep ideas from getting lost — not to force every idea through the full process.

---

## Cadence

- **Weekly** — glance at the wishlist; add new items as they arise; move stale items to `shelved`
- **Monthly** — review the top three by priority; consider running one through the council
- **Quarterly** — prune the bottom (items that haven't moved in 90 days are usually dead)
- **Annually** — revisit the values doc (Part 1); if values shifted, prior council verdicts may need re-running

---

## How items reach the council

1. Item lands on the wishlist (status: `pending`)
2. Item reaches the top of your priorities (any of the four criteria above)
3. You run it through the council using the Part 2 meta-prompt — paste your values doc, the six judge profiles, and the item description as the proposal
4. Council returns six verdicts + a summary
5. You paste the summary into the `council_summary` column, set `status: council_done`
6. Your team makes the actual decision; record it in `your_decision`, set `status: decided`

The council does not decide; you do. The wishlist is where you record both — the council's read AND the decision your org made afterwards. Sometimes they'll diverge. That's fine; the wishlist captures both so you can come back later and see your own reasoning.

---

## v1 → v2 — hardwiring the wishlist into the council

The template ships as a passive log: orgs paste council verdicts into the spreadsheet by hand, and each new council pass starts fresh with no memory of prior verdicts.

A future iteration could **hardwire the wishlist into the council's context** — appending recent decisions to the meta-prompt so the council remembers what it's said before. That would let the council:

- Reference past verdicts ("In April you declined Mailchimp on the same grounds — has anything changed?")
- Flag contradictions ("Beam said no to platform X but the team is asking about platform Y, which is structurally similar")
- Maintain a coherent stance over time rather than re-litigating each decision in isolation
- Build institutional memory of the council's reasoning, not just its outcomes

That's a v2 feature: it needs the wishlist to be in a structured form the prompt can consume (the CSV here is already shaped for this), and it needs the meta-prompt to be extended with a "prior decisions" block. Worth flagging now so orgs adopting the kit can plan toward it, and so the v1 wishlist is shaped in a way that doesn't need rebuilding to upgrade.

If your org wants to skip straight to v2, the lift is small: add the populated CSV (or recent rows of it) as a context block in the meta-prompt, with a one-line instruction asking the council to consider prior verdicts before issuing new ones.

---

## Lineage and use

Modelled on the prioritisation format BLKOUT uses for its own digital capabilities wishlist — adapted to a generic schema that any peer Black queer organisation can fork.

Free to use, adapt, remix. Tell us what you find at commons@blkoutuk.com — particularly what columns you add, what cadence works, and whether the v2 hardwiring is something your org would value.
