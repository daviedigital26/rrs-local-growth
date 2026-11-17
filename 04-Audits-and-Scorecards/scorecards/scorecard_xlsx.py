#!/usr/bin/env python3
"""
Local Revenue Opportunity Scorecard: XLSX builder and importer.

Generated from framework.json (itself generated from framework.ts), so criteria,
points, tiers and evidence rules are never retyped. Called by scorecard.ts:

  python3 -I scorecard_xlsx.py build --framework framework.json --out card.xlsx [--prefill doc.json]
  python3 -I scorecard_xlsx.py read  --framework framework.json --in card.xlsx      # JSON to stdout

Designed for phones (Google Sheets / Excel mobile): dropdowns for every choice,
frozen ID + criterion columns, a live Summary, and "Not verified" as the default.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

FONT = "Arial"
INK, COBALT7, SLATE, SLATE2 = "081020", "3A46BC", "334155", "E0DEDB"
INPUT_FILL = PatternFill("solid", fgColor="EEF0FF")
HEAD_FILL = PatternFill("solid", fgColor=INK)
SECTION_FILL = PatternFill("solid", fgColor="E6E8FF")
CANVAS_FILL = PatternFill("solid", fgColor="F7F4EE")
THIN = Side(style="thin", color=SLATE2)
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

TIER_LABELS = {1.0: "Full (100%)", 0.75: "Most (75%)", 0.5: "Half (50%)", 0.25: "Some (25%)", 0.0: "None (0%)"}
STATUSES = ["Scored", "Not verified", "Not applicable"]
YES_NO_UNKNOWN = ["Yes", "No", "Unknown"]
EFFORTS = ["Low", "Medium", "High"]

SHEET_START, SHEET_CARD, SHEET_SUMMARY = "Start here", "Scorecard", "Summary"
SHEET_COMP, SHEET_WINS, SHEET_NUMBERS = "Competitors", "Quick wins", "Owner numbers"

COLUMNS = [  # (header, width, input?)
    ("Criterion ID", 17, False), ("Criterion", 30, False), ("Points", 7, False),
    ("Status", 14, True), ("Result", 14, True), ("Evidence type", 24, True), ("Evidence note", 42, True),
    ("Date checked", 13, True), ("Source URL", 30, True), ("What to check", 46, False), ("Scoring guide", 52, False),
    ("Override result", 15, True), ("Override reason", 30, True), ("Reviewer", 14, True),
    ("Category", 22, False), ("Tier", 8, False), ("Points earned", 9, False), ("Verified pts", 9, False),
    ("Applicable pts", 10, False), ("Check", 28, False),
]
COL = {h: i + 1 for i, (h, _, _) in enumerate(COLUMNS)}
L = {h: get_column_letter(i) for h, i in COL.items()}
HEADER_ROW = 4
LAST_ROW = 200  # summary formulas look at rows 5..200

START_FIELDS = [  # (label, key, hint)
    ("Business name", "name", "As the business names itself"),
    ("Industry", "industry", "e.g. HVAC, mobile detailing"),
    ("Area (city)", "area", "City as given; don't assume"),
    ("Report date (YYYY-MM-DD)", "reportDate", "Date the Snapshot is as-of"),
    ("Prepared by", "preparedBy", "Your name"),
    ("Fictional sample? (Yes/No)", "fictional", "Yes only for demo businesses"),
]
LEAD_FIELDS = [
    ("Contact name", "contactName"), ("Contact email", "email"), ("Contact phone", "phone"),
    ("Website", "website"), ("Lead source", "source"), ("Lead ID", "leadId"),
]


def font(**kw):
    return Font(name=FONT, **kw)


def tier_label(t):
    return TIER_LABELS[float(t)]


def tiers_for(criterion):
    return [float(k) for k in sorted(criterion["tiers"].keys(), key=lambda x: -float(x))]


def scoring_guide(criterion):
    return "\n".join(f"{tier_label(float(k))}: {v}" for k, v in sorted(criterion["tiers"].items(), key=lambda kv: -float(kv[0])))


def criteria_rows(fw):
    for cat in fw["categories"]:
        yield ("section", cat, None)
        for cr in cat["criteria"]:
            yield ("criterion", cat, cr)


# ── BUILD ──────────────────────────────────────────────────────────────────────
def build(fw: dict, out: str, prefill: dict | None) -> None:
    labels = fw["evidenceLabels"]
    doc = prefill or {}
    inp = doc.get("input", {})
    biz = inp.get("business", {})
    results = {r["criterionId"]: r for r in inp.get("results", [])}

    wb = Workbook()
    ws = wb.active
    ws.title = SHEET_START
    build_start(ws, fw, doc, biz, labels)
    card = wb.create_sheet(SHEET_CARD)
    rows = build_card(card, fw, results, labels)
    build_summary(wb.create_sheet(SHEET_SUMMARY), fw)
    build_competitors(wb.create_sheet(SHEET_COMP), doc.get("competitors", []))
    build_wins(wb.create_sheet(SHEET_WINS), fw, doc.get("immediateOpportunities", []))
    build_numbers(wb.create_sheet(SHEET_NUMBERS), doc.get("scenarioInputs"))
    for sheet in wb.worksheets:
        print_setup(sheet, landscape=sheet.title == SHEET_CARD)
    wb.properties.title = "Local Revenue Opportunity Scorecard"
    wb.properties.creator = "Reale Revenue Systems"
    wb.properties.keywords = f"rrs-scorecard framework-{fw['version']}"
    wb.save(out)
    print(json.dumps({"ok": True, "out": out, "criteria": len(rows)}))


def print_setup(ws, landscape=False):
    """Fit to page width when printed (rows flow onto as many pages as needed)."""
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_LETTER
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.gridLines = False
    ws.page_margins.left = ws.page_margins.right = 0.4
    if ws.title == SHEET_CARD:
        ws.print_title_rows = f"{HEADER_ROW}:{HEADER_ROW}"


def title(ws, text, sub):
    ws["A1"] = text
    ws["A1"].font = font(bold=True, size=15, color=INK)
    ws["A2"] = sub
    ws["A2"].font = font(size=10, color=SLATE)


def section(ws, row, text, cols=2):
    c = ws.cell(row=row, column=1, value=text)
    c.font = font(bold=True, color="FFFFFF")
    for i in range(1, cols + 1):
        ws.cell(row=row, column=i).fill = HEAD_FILL


def build_start(ws, fw, doc, biz, labels):
    title(ws, "Local Revenue Opportunity Snapshot™ Scorecard", f"Framework v{fw['version']} · Reale Revenue Systems · fill the shaded cells")
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 44
    ws.column_dimensions["C"].width = 34
    section(ws, 4, "Business details", 3)
    lead = doc.get("lead") or {}
    values = {
        "name": biz.get("name", ""), "industry": biz.get("industry", ""), "area": biz.get("area", ""),
        "reportDate": doc.get("input", {}).get("reportDate", dt.date.today().isoformat()),
        "preparedBy": doc.get("preparedBy", "Reale Revenue Systems"), "fictional": "Yes" if biz.get("fictional") else "No",
    }
    for i, (label, key, hint) in enumerate(START_FIELDS):
        r = 5 + i
        ws.cell(row=r, column=1, value=label).font = font(bold=True)
        c = ws.cell(row=r, column=2, value=values[key])
        c.fill, c.font, c.border = INPUT_FILL, font(color=INK), BOX
        if key == "reportDate":
            c.number_format = "@"
        ws.cell(row=r, column=3, value=hint).font = font(size=9, color=SLATE)
    dv = DataValidation(type="list", formula1='"Yes,No"', allow_blank=False)
    ws.add_data_validation(dv)
    dv.add("B10")

    section(ws, 12, "Lead (optional, from the website request)", 3)
    for i, (label, key) in enumerate(LEAD_FIELDS):
        r = 13 + i
        ws.cell(row=r, column=1, value=label).font = font(bold=True)
        c = ws.cell(row=r, column=2, value=lead.get(key) or "")
        c.fill, c.font, c.border = INPUT_FILL, font(color=INK), BOX

    section(ws, 20, "How to fill this in", 3)
    steps = [
        "1. Go to the Scorecard tab. Each row is one criterion. 'What to check' says what to look at.",
        "2. Leave Status as 'Not verified' unless you actually observed it. Not verified is never scored as zero.",
        "3. When you verify a criterion: set Status to 'Scored', pick a Result, an Evidence type, and add an Evidence note, Date checked and Source URL.",
        "4. Use 'Not applicable' only when the criterion can't apply to this business (e.g. no website forms for a phone-only business).",
        "5. Optional tabs: Competitors (3–5 nearby), Quick wins, Owner numbers (owner's own example figures, always hypothetical).",
        "6. The Summary tab updates as you go. Then run: npm run scorecard:import -- <this file> --export",
    ]
    for i, s in enumerate(steps):
        c = ws.cell(row=21 + i, column=1, value=s)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        ws.merge_cells(start_row=21 + i, start_column=1, end_row=21 + i, end_column=3)
        ws.row_dimensions[21 + i].height = 32

    section(ws, 28, "Legend", 3)
    legend = [
        ("Shaded cell", "Fill this in (dropdowns where a cell offers one)"),
        ("Status", "Scored = verified with evidence · Not verified = couldn't observe (excluded) · Not applicable = removed from the total"),
        ("Result", "Full (100%) · Most (75%) · Half (50%) · Some (25%) · None (0%). Only the levels defined for that criterion are offered"),
        ("Evidence type", " · ".join(labels.values())),
        ("Override", "Reviewer-only: a different Result with a reason and reviewer name; the original stays in the report"),
    ]
    for i, (k, v) in enumerate(legend):
        r = 29 + i
        a = ws.cell(row=r, column=1, value=k)
        a.font = font(bold=True)
        if k == "Shaded cell":
            a.fill, a.border = INPUT_FILL, BOX
        b = ws.cell(row=r, column=2, value=v)
        b.alignment = Alignment(wrap_text=True, vertical="top")
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
        ws.row_dimensions[r].height = 34

    section(ws, 35, "Example row (format only, not part of any score)", 3)
    example = [
        ("Criterion ID", "maps.local_results"), ("Status", "Scored"), ("Result", "Half (50%)"),
        ("Evidence type", labels["sampled_test"]), ("Evidence note", "Query 'ac repair surprise az', mobile, Surprise city centre: observed position 7"),
        ("Date checked", "2026-11-10"), ("Source URL", "(search results page or screenshot link)"),
    ]
    for i, (k, v) in enumerate(example):
        ws.cell(row=36 + i, column=1, value=k).font = font(size=9, bold=True, color=SLATE)
        c = ws.cell(row=36 + i, column=2, value=v)
        c.font = font(size=9, italic=True, color=SLATE)
    ws.freeze_panes = "A4"
    ws.sheet_view.zoomScale = 110


def build_card(ws, fw, results, labels):
    title(ws, "Scorecard", "Status defaults to 'Not verified'. Verified items need a Result, Evidence type, Evidence note and Date checked.")
    ws["A3"] = f'="Business: "&IF(\'{SHEET_START}\'!B5="","(enter on Start here)",\'{SHEET_START}\'!B5)'
    ws["A3"].font = font(bold=True, color=COBALT7)
    for i, (h, w, is_input) in enumerate(COLUMNS, start=1):
        c = ws.cell(row=HEADER_ROW, column=i, value=h)
        c.font = font(bold=True, color="FFFFFF", size=10)
        c.fill = HEAD_FILL
        c.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[HEADER_ROW].height = 30

    status_dv = DataValidation(type="list", formula1='"' + ",".join(STATUSES) + '"', allow_blank=True, showErrorMessage=True, errorTitle="Status", error="Choose Scored, Not verified or Not applicable")
    ws.add_data_validation(status_dv)
    result_dvs: dict[str, DataValidation] = {}
    evidence_dvs: dict[str, DataValidation] = {}

    def dv_for(cache, values, title_):
        key = ",".join(values)
        if key not in cache:
            dv = DataValidation(type="list", formula1=f'"{key}"', allow_blank=True, showErrorMessage=True, errorTitle=title_, error="Choose a value from the list")
            ws.add_data_validation(dv)
            cache[key] = dv
        return cache[key]

    r = HEADER_ROW + 1
    rows = {}
    for kind, cat, cr in criteria_rows(fw):
        if kind == "section":
            c = ws.cell(row=r, column=1, value=f"{cat['name']} · 20 points · {cat['outcome']}")
            c.font = font(bold=True, color=INK)
            for i in range(1, len(COLUMNS) + 1):
                ws.cell(row=r, column=i).fill = SECTION_FILL
            ws.cell(row=r, column=COL["What to check"], value=cat["question"]).font = font(italic=True, size=9, color=SLATE)
            r += 1
            continue
        res = results.get(cr["id"], {})
        ev = res.get("evidence") or {}
        ov = res.get("override") or {}
        status = {"scored": "Scored", "not_applicable": "Not applicable"}.get(res.get("status"), "Not verified")
        tier = res.get("tier")
        values = {
            "Criterion ID": cr["id"], "Criterion": cr["label"], "Points": cr["points"],
            "Status": status, "Result": tier_label(tier) if tier is not None and status == "Scored" else None,
            "Evidence type": labels.get(ev.get("type")) if ev.get("type") else None, "Evidence note": ev.get("note") or None,
            "Date checked": ev.get("checkedAt") or None, "Source URL": ev.get("sourceUrl") or None,
            "What to check": cr["measure"], "Scoring guide": scoring_guide(cr),
            "Override result": tier_label(ov["tier"]) if ov else None, "Override reason": ov.get("reason") or None, "Reviewer": ov.get("by") or None,
            "Category": cat["name"],
        }
        for h, v in values.items():
            c = ws.cell(row=r, column=COL[h], value=v)
            c.font = font(size=10, color=INK if h != "Category" else SLATE)
            c.alignment = Alignment(wrap_text=h in ("Criterion", "Evidence note", "What to check", "Scoring guide", "Override reason"), vertical="top")
            c.border = BOX
            if COLUMNS[COL[h] - 1][2]:
                c.fill = INPUT_FILL
        ws.cell(row=r, column=COL["Date checked"]).number_format = "@"
        ws.cell(row=r, column=COL["Criterion"]).font = font(size=10, bold=True, color=INK)
        status_dv.add(f"{L['Status']}{r}")
        tier_list = [tier_label(t) for t in tiers_for(cr)]
        dv_for(result_dvs, tier_list, "Result").add(f"{L['Result']}{r}")
        dv_for(result_dvs, tier_list, "Result").add(f"{L['Override result']}{r}")
        dv_for(evidence_dvs, [labels[e] for e in cr["allowedEvidence"]], "Evidence type").add(f"{L['Evidence type']}{r}")

        D, E, F, G, H = (f"${L[x]}{r}" for x in ("Status", "Result", "Evidence type", "Evidence note", "Date checked"))
        Lo, M, N, C, P = (f"${L[x]}{r}" for x in ("Override result", "Override reason", "Reviewer", "Points", "Tier"))
        pick = f'IF({Lo}<>"",{Lo},{E})'
        formulas = {
            "Tier": f'=IF({D}<>"Scored","",IFERROR(VALUE(MID({pick},FIND("(",{pick})+1,FIND("%",{pick})-FIND("(",{pick})-1))/100,""))',
            "Points earned": f'=IF({P}="","",{C}*{P})',
            "Verified pts": f'=IF({P}="",0,{C})',
            "Applicable pts": f'=IF({D}="Not applicable",0,{C})',
            "Check": f'=IF({D}="Scored",IF({E}="","Choose a result",IF({F}="","Choose evidence type",IF({G}="","Add evidence note",IF({H}="","Add date checked",IF(AND({Lo}<>"",OR({M}="",{N}="")),"Override needs reason + reviewer","OK"))))),IF({D}="Not applicable","N/A","Not verified"))',
        }
        for h, f in formulas.items():
            c = ws.cell(row=r, column=COL[h], value=f)
            c.font = font(size=10, color=SLATE)
            c.border = BOX
            if h == "Tier":
                c.number_format = "0%"
        ws.row_dimensions[r].height = 46
        rows[cr["id"]] = r
        r += 1

    check = f"{L['Check']}{HEADER_ROW + 1}:{L['Check']}{LAST_ROW}"
    ws.conditional_formatting.add(check, FormulaRule(formula=[f'AND({L["Check"]}{HEADER_ROW + 1}<>"",{L["Check"]}{HEADER_ROW + 1}<>"OK",{L["Check"]}{HEADER_ROW + 1}<>"N/A",{L["Check"]}{HEADER_ROW + 1}<>"Not verified")'], fill=PatternFill("solid", fgColor="FFF0C2"), font=Font(name=FONT, bold=True, color=INK)))
    ws.conditional_formatting.add(f"{L['Status']}{HEADER_ROW + 1}:{L['Status']}{LAST_ROW}", CellIsRule(operator="equal", formula=['"Not verified"'], font=Font(name=FONT, color="7A8190", italic=True)))
    ws.freeze_panes = f"C{HEADER_ROW + 1}"
    ws.sheet_view.zoomScale = 100
    ws.auto_filter.ref = f"A{HEADER_ROW}:{L['Check']}{r - 1}"
    return rows


def build_summary(ws, fw):
    title(ws, "Summary", "Updates as you fill in the Scorecard. Confidence and the recommended next step are calculated on export.")
    for col, w in zip("ABCDEFGHI", (28, 9, 11, 10, 10, 11, 14, 13, 13)):
        ws.column_dimensions[col].width = w
    ws["A3"], ws["B3"] = "Category minimum coverage", fw["thresholds"]["categoryMinCoverage"]
    ws["A4"], ws["B4"] = "Overall minimum coverage", fw["thresholds"]["overallMinCoverage"]
    for a in ("B3", "B4"):
        ws[a].number_format = "0%"
        ws[a].font = font(color=INK)
    ws["C3"] = "Below this share of verified points a category shows 'Not verified' (framework rule)."
    ws["C4"] = "Below this share no overall score is shown (framework rule)."
    for a in ("A3", "A4", "C3", "C4"):
        ws[a].font = font(size=9, color=SLATE)
    headers = ["Category", "Points", "Applicable", "Verified", "Earned", "Coverage", "Score", "Not verified", "Rows to fix"]
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=6, column=i, value=h)
        c.font, c.fill = font(bold=True, color="FFFFFF"), HEAD_FILL
    rng = lambda col: f"'{SHEET_CARD}'!${L[col]}${HEADER_ROW + 1}:${L[col]}${LAST_ROW}"
    for i, cat in enumerate(fw["categories"]):
        r = 7 + i
        ws.cell(row=r, column=1, value=cat["name"])
        ws.cell(row=r, column=2, value=20)
        ws.cell(row=r, column=3, value=f"=SUMIFS({rng('Applicable pts')},{rng('Category')},$A{r})")
        ws.cell(row=r, column=4, value=f"=SUMIFS({rng('Verified pts')},{rng('Category')},$A{r})")
        ws.cell(row=r, column=5, value=f"=SUMIFS({rng('Points earned')},{rng('Category')},$A{r})")
        ws.cell(row=r, column=6, value=f"=IF(C{r}=0,0,D{r}/C{r})")
        ws.cell(row=r, column=7, value=f'=IF(AND(D{r}>0,F{r}>=$B$3),ROUND(E{r}/D{r}*20,1),"Not verified")')
        ws.cell(row=r, column=8, value=f'=COUNTIFS({rng("Category")},$A{r},{rng("Status")},"Not verified")+COUNTIFS({rng("Category")},$A{r},{rng("Status")},"")')
        ws.cell(row=r, column=9, value=f'=COUNTIFS({rng("Category")},$A{r},{rng("Status")},"Scored",{rng("Check")},"<>OK")')
    t = 7 + len(fw["categories"])
    ws.cell(row=t, column=1, value="Overall")
    ws.cell(row=t, column=2, value=f"=SUM(B7:B{t - 1})")
    for col in "CDEHI":
        ws[f"{col}{t}"] = f"=SUM({col}7:{col}{t - 1})"
    ws[f"F{t}"] = f"=IF(C{t}=0,0,D{t}/C{t})"
    ws[f"G{t}"] = f'=IF(AND(D{t}>0,F{t}>=$B$4),ROUND(E{t}/D{t}*100,0),"Not enough evidence")'
    for r in range(7, t + 1):
        for c in range(1, 10):
            cell = ws.cell(row=r, column=c)
            cell.border = BOX
            cell.font = font(bold=(r == t), color=INK)
        ws.cell(row=r, column=6).number_format = "0%"
        ws.cell(row=r, column=5).number_format = "0.0"
        ws.cell(row=r, column=7).number_format = "0.0" if r < t else "0"
    ws.cell(row=t, column=7).fill = CANVAS_FILL
    ws[f"A{t + 2}"] = "Score: points earned ÷ points verified, scaled to 20 (categories) or 100 (overall). Not verified items are excluded, never counted as zero."
    ws[f"A{t + 3}"] = "'Rows to fix' counts Scored rows missing a Result, evidence type, note or date. The importer refuses those until fixed."
    for a in (f"A{t + 2}", f"A{t + 3}"):
        ws[a].font = font(size=9, color=SLATE)
    ws.freeze_panes = "A7"


def table_sheet(ws, heading, sub, headers, widths):
    title(ws, heading, sub)
    for i, (h, w) in enumerate(zip(headers, widths), start=1):
        c = ws.cell(row=3, column=i, value=h)
        c.font, c.fill = font(bold=True, color="FFFFFF"), HEAD_FILL
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A4"


def input_cell(ws, r, c, v=None, fmt=None):
    cell = ws.cell(row=r, column=c, value=v)
    cell.fill, cell.border, cell.font = INPUT_FILL, BOX, font(color=INK)
    if fmt:
        cell.number_format = fmt
    return cell


def build_competitors(ws, comps):
    table_sheet(ws, "Competitors", "3–5 nearby businesses in the same category. Public data only, with the date you checked it in your notes.", ["Business", "Google reviews", "Rating", "Structured data", "Mobile tap-to-call"], [34, 15, 10, 16, 18])
    dv = DataValidation(type="list", formula1='"' + ",".join(YES_NO_UNKNOWN) + '"', allow_blank=True)
    ws.add_data_validation(dv)
    yn = lambda v: "Unknown" if v is None else ("Yes" if v else "No")
    for i in range(5):
        r = 4 + i
        c = comps[i] if i < len(comps) else {}
        input_cell(ws, r, 1, c.get("name"))
        input_cell(ws, r, 2, c.get("reviews"), "0")
        input_cell(ws, r, 3, c.get("rating"), "0.0")
        input_cell(ws, r, 4, yn(c.get("schema")) if c else None)
        input_cell(ws, r, 5, yn(c.get("mobileCta")) if c else None)
        dv.add(f"D{r}")
        dv.add(f"E{r}")


def build_wins(ws, fw, wins):
    table_sheet(ws, "Quick wins", "Up to 6 concrete next actions, each tied to a category.", ["Category", "Action", "Effort"], [26, 64, 10])
    names = {c["id"]: c["name"] for c in fw["categories"]}
    cat_dv = DataValidation(type="list", formula1='"' + ",".join(names.values()) + '"', allow_blank=True)
    eff_dv = DataValidation(type="list", formula1='"' + ",".join(EFFORTS) + '"', allow_blank=True)
    ws.add_data_validation(cat_dv)
    ws.add_data_validation(eff_dv)
    for i in range(6):
        r = 4 + i
        w = wins[i] if i < len(wins) else {}
        input_cell(ws, r, 1, names.get(w.get("category")) if w else None)
        input_cell(ws, r, 2, w.get("action")).alignment = Alignment(wrap_text=True, vertical="top")
        input_cell(ws, r, 3, w.get("effort"))
        cat_dv.add(f"A{r}")
        eff_dv.add(f"C{r}")


def build_numbers(ws, numbers):
    title(ws, "Owner numbers (hypothetical)", "Only the owner's own example figures. Used for clearly labelled 'what if' scenarios, never as verified lost revenue.")
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 50
    n = numbers or {}
    rows = [("Monthly inquiries", n.get("monthlyInquiries"), "0", "Roughly how many calls/forms/messages per month"),
            ("Close rate", n.get("closeRate"), "0%", "Share of inquiries that become jobs, e.g. 30%"),
            ("Average job ($)", n.get("averageJobValue"), "$#,##0", "Typical job value in dollars")]
    for i, (label, v, fmt, hint) in enumerate(rows):
        r = 4 + i
        ws.cell(row=r, column=1, value=label).font = font(bold=True)
        input_cell(ws, r, 2, v, fmt)
        ws.cell(row=r, column=3, value=hint).font = font(size=9, color=SLATE)
    ws["A8"] = "Leave all three blank if the owner hasn't shared them. Fill all three or none."
    ws["A8"].font = font(size=9, color=SLATE)


# ── READ ───────────────────────────────────────────────────────────────────────
def norm_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    if isinstance(v, (int, float)) and 20000 < v < 80000:  # Excel serial date
        return (dt.date(1899, 12, 30) + dt.timedelta(days=int(v))).isoformat()
    s = str(v).strip()
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        y, mo, d = map(int, m.groups())
    else:
        m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)  # US M/D/YYYY
        if not m:
            raise ValueError(s)
        mo, d, y = map(int, m.groups())
    return dt.date(y, mo, d).isoformat()


def text(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def parse_tier(v):
    s = text(v)
    if not s:
        return None
    m = re.search(r"\((\d+)%\)", s) or re.fullmatch(r"(\d+)\s*%?", s)
    if not m:
        raise ValueError(s)
    return int(m.group(1)) / 100


def read(fw: dict, path: str) -> dict:
    errors, warnings = [], []
    wb = load_workbook(path, data_only=False)
    for name in (SHEET_START, SHEET_CARD):
        if name not in wb.sheetnames:
            return {"document": None, "errors": [f"Missing sheet '{name}'. Is this a Scorecard workbook?"], "warnings": [], "rows": {}}
    label_to_key = {lab: key for lab, key, _ in START_FIELDS}
    lead_keys = dict(LEAD_FIELDS)
    start = wb[SHEET_START]
    biz, lead = {}, {}
    for r in range(1, 60):
        lab = text(start.cell(row=r, column=1).value)
        val = start.cell(row=r, column=2).value
        if lab in label_to_key:
            biz[label_to_key[lab]] = (val, f"'{SHEET_START}'!B{r}")
        elif lab in lead_keys and text(val):
            lead[lead_keys[lab]] = text(val)
    name = text(biz.get("name", (None,))[0])
    if not name:
        errors.append(f"{biz.get('name', (None, SHEET_START))[1]}: Business name is required")
    try:
        report_date = norm_date(biz.get("reportDate", (None,))[0])
        if not report_date:
            errors.append(f"{biz.get('reportDate', (None, SHEET_START))[1]}: Report date is required (YYYY-MM-DD)")
    except ValueError as e:
        report_date = None
        errors.append(f"{biz['reportDate'][1]}: Report date '{e}' isn't a date (use YYYY-MM-DD)")

    labels = fw["evidenceLabels"]
    label_to_type = {v.lower(): k for k, v in labels.items()}
    crit = {cr["id"]: cr for cat in fw["categories"] for cr in cat["criteria"]}
    ws = wb[SHEET_CARD]
    header_row, cols = None, {}
    for r in range(1, 15):
        hdrs = {text(ws.cell(row=r, column=c).value): c for c in range(1, ws.max_column + 1)}
        if "Criterion ID" in hdrs and "Status" in hdrs:
            header_row, cols = r, hdrs
            break
    if not header_row:
        return {"document": None, "errors": [f"'{SHEET_CARD}': header row with 'Criterion ID' and 'Status' not found"], "warnings": [], "rows": {}}
    for h in ("Status", "Result", "Evidence type", "Evidence note", "Date checked", "Source URL", "Override result", "Override reason", "Reviewer"):
        if h not in cols:
            errors.append(f"'{SHEET_CARD}': column '{h}' is missing")
    if errors and not cols:
        return {"document": None, "errors": errors, "warnings": warnings, "rows": {}}

    def cell(r, h):
        return ws.cell(row=r, column=cols[h]).value if h in cols else None

    def ref(r, h):
        return f"'{SHEET_CARD}'!{get_column_letter(cols[h])}{r}" if h in cols else f"'{SHEET_CARD}' row {r}"

    results, rows, seen = [], {}, set()
    for r in range(header_row + 1, ws.max_row + 1):
        cid = text(cell(r, "Criterion ID"))
        if cid not in crit:
            continue
        if cid in seen:
            errors.append(f"{ref(r, 'Criterion ID')}: {cid} appears twice")
            continue
        seen.add(cid)
        rows[cid] = r
        cr = crit[cid]
        status = text(cell(r, "Status")) or "Not verified"
        if status not in STATUSES:
            errors.append(f"{ref(r, 'Status')} ({cid}): status '{status}' must be one of {', '.join(STATUSES)}")
            continue
        if status == "Not verified":
            results.append({"criterionId": cid, "status": "not_verified"})
            continue
        if status == "Not applicable":
            results.append({"criterionId": cid, "status": "not_applicable"})
            continue
        row_errors = []
        try:
            tier = parse_tier(cell(r, "Result"))
        except ValueError as e:
            tier, _ = None, row_errors.append(f"{ref(r, 'Result')} ({cid}): result '{e}' not recognised")
        allowed_tiers = tiers_for(cr)
        if tier is None and not row_errors:
            row_errors.append(f"{ref(r, 'Result')} ({cid}): Scored rows need a Result")
        elif tier is not None and tier not in allowed_tiers:
            row_errors.append(f"{ref(r, 'Result')} ({cid}): {int(tier * 100)}% isn't a level for this criterion (allowed: {', '.join(tier_label(t) for t in allowed_tiers)})")
        ev_label = text(cell(r, "Evidence type")).lower()
        ev_type = label_to_type.get(ev_label)
        if not ev_label:
            row_errors.append(f"{ref(r, 'Evidence type')} ({cid}): Scored rows need an Evidence type")
        elif not ev_type or ev_type not in cr["allowedEvidence"]:
            row_errors.append(f"{ref(r, 'Evidence type')} ({cid}): '{text(cell(r, 'Evidence type'))}' isn't allowed here (allowed: {', '.join(labels[e] for e in cr['allowedEvidence'])})")
        note = text(cell(r, "Evidence note"))
        if not note:
            row_errors.append(f"{ref(r, 'Evidence note')} ({cid}): add an Evidence note describing what you observed")
        try:
            checked = norm_date(cell(r, "Date checked"))
            if not checked:
                row_errors.append(f"{ref(r, 'Date checked')} ({cid}): add the date you checked (YYYY-MM-DD)")
        except ValueError as e:
            checked = None
            row_errors.append(f"{ref(r, 'Date checked')} ({cid}): '{e}' isn't a date (use YYYY-MM-DD)")
        if checked and report_date and checked > report_date:
            warnings.append(f"{ref(r, 'Date checked')} ({cid}): checked {checked} is after the report date {report_date}")
        override = None
        if text(cell(r, "Override result")):
            try:
                ot = parse_tier(cell(r, "Override result"))
            except ValueError:
                ot = None
            reason, by = text(cell(r, "Override reason")), text(cell(r, "Reviewer"))
            if ot is None or ot not in allowed_tiers:
                row_errors.append(f"{ref(r, 'Override result')} ({cid}): override must be one of {', '.join(tier_label(t) for t in allowed_tiers)}")
            elif not reason or not by:
                row_errors.append(f"{ref(r, 'Override reason')} ({cid}): an override needs a reason and a reviewer name")
            else:
                override = {"tier": ot, "reason": reason, "by": by, "at": report_date or checked}
        if row_errors:
            errors.extend(row_errors)
            continue
        evidence = {"type": ev_type, "note": note, "checkedAt": checked}
        src = text(cell(r, "Source URL"))
        if src:
            evidence["sourceUrl"] = src
        item = {"criterionId": cid, "status": "scored", "tier": tier, "evidence": evidence}
        if override:
            item["override"] = override
        results.append(item)
    missing = [cid for cid in crit if cid not in seen]
    if missing:
        warnings.append(f"{len(missing)} criteria rows not found (treated as Not verified): {', '.join(missing)}")

    competitors, wins, numbers = [], [], None
    if SHEET_COMP in wb.sheetnames:
        cs = wb[SHEET_COMP]
        for r in range(4, 4 + 10):
            nm = text(cs.cell(row=r, column=1).value)
            if not nm:
                continue
            item = {"name": nm}
            for key, c, kind in (("reviews", 2, int), ("rating", 3, float)):
                v = cs.cell(row=r, column=c).value
                if text(v):
                    try:
                        item[key] = kind(float(v))
                    except ValueError:
                        errors.append(f"'{SHEET_COMP}'!{get_column_letter(c)}{r}: '{v}' should be a number")
            for key, c in (("schema", 4), ("mobileCta", 5)):
                v = text(cs.cell(row=r, column=c).value).lower()
                if v in ("yes", "no"):
                    item[key] = v == "yes"
            competitors.append(item)
    if SHEET_WINS in wb.sheetnames:
        wsx = wb[SHEET_WINS]
        name_to_id = {c["name"].lower(): c["id"] for c in fw["categories"]}
        for r in range(4, 4 + 12):
            action = text(wsx.cell(row=r, column=2).value)
            if not action:
                continue
            cat = name_to_id.get(text(wsx.cell(row=r, column=1).value).lower())
            if not cat:
                errors.append(f"'{SHEET_WINS}'!A{r}: choose a category for '{action[:40]}'")
                continue
            effort = text(wsx.cell(row=r, column=3).value) or "Medium"
            wins.append({"category": cat, "action": action, "effort": effort if effort in EFFORTS else "Medium"})
    if SHEET_NUMBERS in wb.sheetnames:
        ns = wb[SHEET_NUMBERS]
        vals = [ns.cell(row=r, column=2).value for r in (4, 5, 6)]
        filled = [v for v in vals if text(v)]
        if filled and len(filled) < 3:
            errors.append(f"'{SHEET_NUMBERS}': fill all three owner numbers or leave all blank")
        elif filled:
            try:
                inq, close, job = (float(str(v).replace("%", "").replace("$", "").replace(",", "")) for v in vals)
                if close > 1:
                    close = close / 100
                if inq <= 0 or not (0 < close <= 1) or job <= 0:
                    raise ValueError
                numbers = {"monthlyInquiries": round(inq), "closeRate": round(close, 4), "averageJobValue": round(job, 2)}
            except ValueError:
                errors.append(f"'{SHEET_NUMBERS}'!B4:B6: owner numbers must be positive, close rate between 1% and 100%")

    fictional = text(biz.get("fictional", ("No",))[0]).lower() == "yes"
    document = {
        "input": {
            "business": {"name": name, "industry": text(biz.get("industry", ("",))[0]) or "Unknown", "area": text(biz.get("area", ("",))[0]) or "Unknown", "fictional": fictional},
            "reportDate": report_date,
            "results": results,
        },
        "competitors": competitors,
        "immediateOpportunities": wins,
        "preparedBy": text(biz.get("preparedBy", ("",))[0]) or "Reale Revenue Systems",
    }
    if numbers:
        document["scenarioInputs"] = numbers
    if lead:
        document["lead"] = lead
    if fictional:
        document["_notice"] = f"FICTIONAL SAMPLE. {name} is an invented business."
    return {"document": document, "errors": errors, "warnings": warnings, "rows": rows}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--framework", required=True)
    b.add_argument("--out", required=True)
    b.add_argument("--prefill")
    rd = sub.add_parser("read")
    rd.add_argument("--framework", required=True)
    rd.add_argument("--in", dest="inp", required=True)
    a = ap.parse_args(argv)
    with open(a.framework, encoding="utf-8") as f:
        fw = json.load(f)
    if a.cmd == "build":
        prefill = None
        if a.prefill:
            with open(a.prefill, encoding="utf-8") as f:
                prefill = json.load(f)
        build(fw, a.out, prefill)
    else:
        print(json.dumps(read(fw, a.inp)))


if __name__ == "__main__":
    sys.exit(main())
