"""Generate proposal PDF from markdown content using fpdf2."""
import os
from fpdf import FPDF

FONTS_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
OUTPUT = os.path.join(os.path.dirname(__file__), "2026 \u96fb\u5b50\u559c\u5e16\u8207\u611f\u8b1d\u5361\u7247 \u63d0\u6848\u8207\u5831\u50f9\u55ae.pdf")

# Colors
NAVY = (44, 62, 80)
DARK = (55, 55, 55)
GRAY = (120, 120, 120)
LIGHT_BG = (248, 246, 243)
ACCENT = (166, 124, 82)
TABLE_HEADER_BG = (44, 62, 80)
TABLE_HEADER_FG = (255, 255, 255)
TABLE_ROW_ALT = (245, 243, 240)
WHITE = (255, 255, 255)
DIVIDER = (200, 190, 180)


class ProposalPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)
        # Register fonts
        font_path = os.path.join(FONTS_DIR, "msjh.ttc")
        self.add_font("msjh", "", font_path, uni=True)
        self.add_font("msjh", "B", os.path.join(FONTS_DIR, "msjhbd.ttc"), uni=True)

    def header(self):
        if self.page_no() > 1:
            self.set_font("msjh", "", 7)
            self.set_text_color(*GRAY)
            self.cell(0, 6, "Ohara Lab \u6b50\u54c8\u62c9\u667a\u9020\u6240  |  \u96fb\u5b50\u559c\u5e16 & \u611f\u8b1d\u5361\u7247\u670d\u52d9\u5efa\u8b70\u66f8", align="R")
            self.ln(3)
            self.set_draw_color(*DIVIDER)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("msjh", "", 7)
        self.set_text_color(*GRAY)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def section_title(self, text):
        self.ln(4)
        self.set_font("msjh", "B", 13)
        self.set_text_color(*NAVY)
        self.cell(0, 9, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*ACCENT)
        self.set_line_width(0.6)
        self.line(10, self.get_y(), 80, self.get_y())
        self.set_line_width(0.2)
        self.ln(4)

    def body_text(self, text, bold=False, indent=0):
        self.set_font("msjh", "B" if bold else "", 9.5)
        self.set_text_color(*DARK)
        x = self.get_x()
        if indent:
            self.set_x(x + indent)
        self.multi_cell(0 if not indent else 190 - indent - 10, 6, text)
        self.ln(1)

    def note_text(self, text):
        self.set_fill_color(*LIGHT_BG)
        self.set_font("msjh", "", 8.5)
        self.set_text_color(*GRAY)
        x = self.get_x()
        self.set_x(x + 4)
        self.multi_cell(176, 5.5, text, fill=True)
        self.ln(2)

    def bullet(self, text, indent=10):
        self.set_font("msjh", "", 9.5)
        self.set_text_color(*DARK)
        x = self.get_x()
        self.set_x(x + indent)
        self.cell(5, 6, "\u2022")
        self.multi_cell(170 - indent, 6, text)
        self.ln(0.5)

    def simple_table(self, headers, rows, col_widths=None):
        if col_widths is None:
            w = 190 / len(headers)
            col_widths = [w] * len(headers)

        line_h = 5.5
        cell_pad = 1

        def _draw_row(row_data, is_header=False, fill_bg=False):
            """Draw a single table row, handling page breaks."""
            if is_header:
                self.set_font("msjh", "B", 8.5)
            else:
                self.set_font("msjh", "", 8.5)

            # Calculate row height
            max_lines = 1
            for ci, cell_text in enumerate(row_data):
                txt = cell_text.strip("*") if cell_text.startswith("**") else cell_text
                lines = self.multi_cell(
                    col_widths[ci] - 2 * cell_pad, line_h, txt,
                    dry_run=True, output="LINES"
                )
                max_lines = max(max_lines, len(lines))
            row_h = max(7, max_lines * line_h + 2 * cell_pad)

            # Check if we need a new page
            if self.get_y() + row_h > self.h - self.b_margin:
                self.add_page()

            x_start = self.get_x()
            y_start = self.get_y()

            for ci, cell_text in enumerate(row_data):
                x = x_start + sum(col_widths[:ci])

                # Background
                if is_header:
                    self.set_fill_color(*TABLE_HEADER_BG)
                    self.set_text_color(*TABLE_HEADER_FG)
                elif fill_bg:
                    self.set_fill_color(*TABLE_ROW_ALT)
                    self.set_text_color(*DARK)
                else:
                    self.set_text_color(*DARK)

                self.rect(x, y_start, col_widths[ci], row_h,
                          "DF" if (is_header or fill_bg) else "D")

                # Text
                is_bold = not is_header and cell_text.startswith("**") and cell_text.endswith("**")
                txt = cell_text.strip("*") if is_bold else cell_text
                if is_bold:
                    self.set_font("msjh", "B", 8.5)

                self.set_xy(x + cell_pad, y_start + cell_pad)
                if is_header:
                    # Center header text vertically
                    self.cell(col_widths[ci] - 2 * cell_pad, row_h - 2 * cell_pad,
                              txt, align="C")
                else:
                    self.multi_cell(col_widths[ci] - 2 * cell_pad, line_h, txt)

                if is_bold:
                    self.set_font("msjh", "", 8.5)

            self.set_xy(x_start, y_start + row_h)

        _draw_row(headers, is_header=True)
        for ri, row in enumerate(rows):
            _draw_row(row, fill_bg=(ri % 2 == 1))
        self.ln(3)


def build_pdf():
    pdf = ProposalPDF()

    # === Cover Page ===
    pdf.add_page()
    pdf.ln(50)
    pdf.set_font("msjh", "B", 26)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 14, "\u96fb\u5b50\u559c\u5e16 & \u96fb\u5b50\u611f\u8b1d\u5361\u7247", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_font("msjh", "", 16)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 10, "\u670d\u52d9\u5efa\u8b70\u66f8\u8207\u5831\u50f9\u55ae", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(12)
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(0.8)
    pdf.line(70, pdf.get_y(), 140, pdf.get_y())
    pdf.set_line_width(0.2)
    pdf.ln(12)
    pdf.set_font("msjh", "B", 12)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 8, "Ohara Lab \u6b50\u54c8\u62c9\u667a\u9020\u6240", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("msjh", "", 10)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 7, "hello@oharalab.com  |  oharalab.com", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(40)
    pdf.set_font("msjh", "", 9)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 6, "\u672c\u5efa\u8b70\u66f8\u6709\u6548\u671f\u9650\uff1a\u767c\u51fa\u5f8c 14 \u65e5", align="C")

    # === Page 2: Sections 1-3 ===
    pdf.add_page()

    pdf.section_title("\u4e00\u3001\u5c08\u6848\u6982\u8ff0")
    pdf.body_text(
        "\u672c\u63d0\u6848\u91dd\u5c0d\u7532\u65b9\u5a5a\u79ae\u6240\u9700\u4e4b\u300c\u96fb\u5b50\u559c\u5e16\u300d\u53ca\u300c\u96fb\u5b50\u611f\u8b1d\u5361\u7247\u300d\u5169\u9805\u670d\u52d9\uff0c\u63d0\u4f9b\u5ba2\u88fd\u5316\u7db2\u9801\u8a2d\u8a08\u8207\u958b\u767c\u3002"
        "\u8cd3\u5ba2\u900f\u904e\u9023\u7d50\u6216 QR Code \u5373\u53ef\u958b\u555f\u5c08\u5c6c\u9801\u9762\uff0c\u5448\u73fe\u5177\u8cea\u611f\u7684\u4e92\u52d5\u9ad4\u9a57\u3002"
    )

    pdf.section_title("\u4e8c\u3001\u670d\u52d9\u9805\u76ee\u8207\u5831\u50f9")
    pdf.simple_table(
        ["\u9805\u76ee", "\u8aaa\u660e", "\u5ba2\u88fd\u5316\u5b9a\u50f9", "\u597d\u53cb\u512a\u60e0\u50f9"],
        [
            ["\u96fb\u5b50\u559c\u5e16", "\u5ba2\u88fd\u5316\u5a5a\u79ae\u96fb\u5b50\u559c\u5e16\u7db2\u9801\uff08\u542b\u9ede\u64ca\u958b\u555f\u52d5\u756b\u3001\u5167\u5bb9\u6392\u7248\uff09", "NT$ 6,600", "NT$ 3,600"],
            ["\u96fb\u5b50\u611f\u8b1d\u5361\u7247", "\u5ba2\u88fd\u5316\u8cd3\u5ba2\u611f\u8b1d\u5361\u7247\u7cfb\u7d71\uff08\u542b\u9ede\u64ca\u958b\u555f\u52d5\u756b\u3001\u500b\u4eba\u5316\u5167\u5bb9\uff09", "NT$ 6,600", "NT$ 3,600"],
            ["**\u5408\u8cfc\u512a\u60e0**", "**\u5169\u9805\u670d\u52d9\u5408\u8cfc**", "**NT$ 12,000**", "**NT$ 6,600**"],
        ],
        [28, 97, 33, 32],
    )

    pdf.note_text(
        "\u5099\u8a3b\uff1a\u5982\u6709\u5176\u4ed6\u96b1\u79c1\u9700\u6c42\u6216\u81ea\u8a02\u7db2\u57df\u9700\u6c42\uff0c\u8acb\u8207\u4e59\u65b9\u806f\u7e6b\u8aee\u8a62\u3002"
    )

    # === Deliverables ===
    pdf.section_title("\u4e09\u3001\u5404\u670d\u52d9\u4ea4\u4ed8\u5167\u5bb9")

    pdf.body_text("A. \u96fb\u5b50\u559c\u5e16", bold=True)
    pdf.simple_table(
        ["\u9805\u76ee", "\u5167\u5bb9"],
        [
            ["\u958b\u555f\u65b9\u5f0f", "\u9ede\u64ca\u4e92\u52d5\u958b\u555f\uff08\u4fe1\u5c01\u958b\u555f\u52d5\u756b\uff09"],
            ["\u9801\u9762\u5167\u5bb9", "\u4f9d\u7532\u65b9\u63d0\u4f9b\u4e4b\u7d20\u6750\u9032\u884c\u6392\u7248\u8a2d\u8a08\uff08\u65b0\u4eba\u7167\u7247\u3001\u5a5a\u79ae\u8cc7\u8a0a\u3001\u5730\u9ede\u3001\u6642\u9593\u7b49\uff09\uff0c\u4e0d\u542b\u624b\u7e6a\u52d5\u756b\uff0c\u63d2\u756b\u7d20\u6750\u8acb\u7532\u65b9\u63d0\u4f9b"],
            ["\u5b57\u578b", "\u76e1\u91cf\u6311\u9078\u8cbc\u8fd1\u53c3\u8003\u7bc4\u4f8b\u4e4b\u5b57\u578b\uff1b\u5982\u6709\u7279\u6b8a\u9700\u6c42\uff0c\u8acb\u7532\u65b9\u63d0\u4f9b\u5b57\u578b\u6a94\u6848"],
            ["\u7db2\u5740", "\u9810\u8a2d\u516c\u7248\u7db2\u5740\uff1awedding.oharalab.com/\u5c08\u5c6c\u4ee3\u78bc"],
            ["\u88dd\u7f6e\u652f\u63f4", "\u624b\u6a5f\u3001\u5e73\u677f\u3001\u96fb\u8166\u7686\u53ef\u700f\u89bd\uff08\u4ee5\u624b\u6a5f\u70ba\u4e3b\u8981\u700f\u89bd\u88dd\u7f6e\u512a\u5316\uff09"],
        ],
        [30, 160],
    )

    pdf.body_text("B. \u96fb\u5b50\u611f\u8b1d\u5361\u7247", bold=True)
    pdf.simple_table(
        ["\u9805\u76ee", "\u5167\u5bb9"],
        [
            ["\u958b\u555f\u65b9\u5f0f", "\u9ede\u64ca\u4e92\u52d5\u958b\u555f\uff08\u4fe1\u5c01/\u5361\u7247\u958b\u555f\u52d5\u756b\uff09"],
            ["\u9a57\u8b49\u6d41\u7a0b", "\u8cd3\u5ba2\u8f38\u5165\u59d3\u540d\u8207\u96fb\u8a71 \u2192 \u9a57\u8b49\u8eab\u4efd \u2192 \u958b\u555f\u5c08\u5c6c\u5361\u7247"],
            ["\u5361\u7247\u5167\u5bb9", "\u8207\u670b\u53cb\u7684\u5408\u7167\u3001\u5c0d\u670b\u53cb\u8aaa\u7684\u8a71\u3001\u5236\u5f0f\u795d\u798f\u8a9e\u8207\u65e5\u671f"],
            ["\u8a2d\u8a08\u8cea\u611f", "\u6d6e\u96d5\u7d19\u8cea\u6548\u679c\u3001Thank you \u5b57\u9ad4\u6392\u7248"],
            ["\u7db2\u5740", "\u9810\u8a2d\u516c\u7248\u7db2\u5740\uff1awedding.oharalab.com/\u5c08\u5c6c\u4ee3\u78bc/card"],
        ],
        [30, 160],
    )

    # === Page 3: Sections 4-6 ===
    pdf.add_page()

    # === Materials ===
    pdf.section_title("\u56db\u3001\u7532\u65b9\u9700\u63d0\u4f9b\u7d20\u6750")

    pdf.body_text("\u96fb\u5b50\u559c\u5e16", bold=True)
    for item in [
        "\u65b0\u4eba\u5408\u7167 / \u5a5a\u7d17\u7167\uff08\u5efa\u8b70\u4f9d\u6392\u7248\u9700\u6c42\u6e96\u5099 10~15 \u5f35\uff0c\u89e3\u6790\u5ea6\u5efa\u8b70 1MB \u4ee5\u4e0a\uff09",
        "\u5a5a\u79ae\u8cc7\u8a0a\uff08\u65e5\u671f\u3001\u6642\u9593\u3001\u5730\u9ede\u3001\u5730\u5740\uff09",
        "\u65b0\u4eba\u59d3\u540d\u8207\u7a31\u547c\u65b9\u5f0f",
        "\u5176\u4ed6\u60f3\u5448\u73fe\u7684\u6587\u5b57\u5167\u5bb9\uff08\u9080\u8acb\u8a9e\u3001\u6545\u4e8b\u7b49\uff09",
        "\u6392\u7248\u9700\u6c42\u6216\u6545\u4e8b\u908f\u8f2f\u8aaa\u660e\uff08\u53ef\u53c3\u8003\u4e59\u65b9\u521d\u7248\u6392\u7248\u5f8c\u518d\u8abf\u6574\uff09",
    ]:
        pdf.bullet(item)

    pdf.ln(2)
    pdf.body_text("\u96fb\u5b50\u611f\u8b1d\u5361\u7247", bold=True)
    for item in [
        "\u8cd3\u5ba2\u540d\u55ae\uff08\u59d3\u540d\u3001\u96fb\u8a71\u3001\u5206\u914d\u7167\u7247\uff09",
        "\u8207\u5404\u4f4d\u670b\u53cb\u7684\u5408\u7167\uff08\u53ef\u66ff\u63db\u70ba\u670b\u53cb\u5408\u7167\uff0c\u82e5\u8a72\u540d\u89aa\u53cb\u7121\u5408\u7167\u5247\u4ee5\u516c\u7248\u7167\u7247\u5448\u73fe\uff09",
        "\u5c0d\u5404\u4f4d\u670b\u53cb\u7684\u500b\u4eba\u5316\u8a0a\u606f\uff08\u6700\u9072\u9808\u65bc\u5a5a\u79ae\u524d\u4e00\u9031\u5b8c\u6210\u5b9a\u7a3f\u78ba\u8a8d\uff09",
        "\u516c\u7248\u5361\u7247\u6587\u5b57\u5167\u5bb9\uff08\u4f9b\u672a\u63d0\u4f9b\u500b\u4eba\u5316\u8a0a\u606f\u4e4b\u8cd3\u5ba2\u4f7f\u7528\uff09",
        "\u5236\u5f0f\u795d\u798f\u8a9e\uff08\u5982\u7d71\u4e00\u4f7f\u7528\u76f8\u540c\u7684\u7d50\u5c3e\u8a9e\u53e5\uff09",
    ]:
        pdf.bullet(item)

    # === Design flow ===
    pdf.section_title("\u4e94\u3001\u8a2d\u8a08\u8207\u4fee\u6539\u6d41\u7a0b")

    steps = [
        "1. \u7532\u65b9\u63d0\u4f9b\u7d20\u6750\u8207\u9700\u6c42\u8aaa\u660e",
        "2. \u4e59\u65b9\u4f9d\u64da\u7d20\u6750\u5b8c\u6210\u521d\u7248\u6392\u7248\u8207\u6a23\u5f0f\u8a2d\u8a08",
        "3. \u7532\u65b9\u6aa2\u8996\u4e26\u63d0\u51fa\u4fee\u6539\u610f\u898b",
        "4. \u4e59\u65b9\u9032\u884c\u4fee\u6539\uff08\u539f\u5247 3 \u6b21\u4fee\u6539\u6a5f\u6703\uff09",
        "5. \u7532\u65b9\u78ba\u8a8d\u9a57\u6536",
    ]
    for s in steps:
        pdf.body_text(s, indent=5)

    pdf.ln(2)
    pdf.body_text("\u4fee\u6539\u8aaa\u660e\uff1a", bold=True)
    for item in [
        "\u57fa\u672c\u63d0\u4f9b 3 \u6b21\u4fee\u6539\u6a5f\u6703\uff0c\u6bcf\u6b21\u4fee\u6539\u6db5\u84cb\u8a72\u8f2a\u6240\u6709\u8abf\u6574\u9805\u76ee",
        "\u4fee\u6539\u7bc4\u570d\u5305\u542b\uff1a\u6587\u5b57\u5167\u5bb9\u3001\u7167\u7247\u66f4\u63db\u3001\u914d\u8272\u5fae\u8abf\u3001\u6392\u7248\u8abf\u6574\u7b49",
        "\u4e0d\u542b\u5927\u5e45\u5ea6\u91cd\u65b0\u8a2d\u8a08\uff08\u5982\u6574\u9ad4\u98a8\u683c\u63a8\u7ffb\u91cd\u505a\uff09",
        "\u8cd3\u5ba2\u540d\u55ae\u8cc7\u6599\u66f4\u65b0\uff08\u65b0\u589e\u3001\u4fee\u6539\u3001\u522a\u9664\uff09\u4e0d\u9650\u6b21\u6578\uff0c\u4e0d\u8a08\u5165\u4fee\u6539\u6b21\u6578",
    ]:
        pdf.bullet(item)

    # === Acceptance ===
    pdf.section_title("\u516d\u3001\u9a57\u6536\u689d\u4ef6")
    conditions = [
        "\u5167\u5bb9\u6b63\u78ba\uff1a\u6240\u6709\u6587\u5b57\u3001\u7167\u7247\u3001\u65e5\u671f\u7b49\u8cc7\u8a0a\u8207\u7532\u65b9\u6700\u7d42\u78ba\u8a8d\u7248\u672c\u4e00\u81f4",
        "\u529f\u80fd\u6b63\u5e38\uff1a\u9801\u9762\u53ef\u6b63\u5e38\u958b\u555f\u3001\u4e92\u52d5\u52d5\u756b\u6b63\u5e38\u904b\u4f5c\u3001\u9023\u7d50\u53ef\u6b63\u5e38\u5b58\u53d6",
        "\u88dd\u7f6e\u76f8\u5bb9\uff1a\u65bc\u4e3b\u6d41\u624b\u6a5f\u700f\u89bd\u5668\uff08Chrome\u3001Safari\uff09\u53ef\u6b63\u5e38\u986f\u793a",
        "\u7532\u65b9\u66f8\u9762\u78ba\u8a8d\uff1a\u7532\u65b9\u4ee5\u6587\u5b57\u8a0a\u606f\uff08LINE\u3001Email \u7b49\uff09\u56de\u8986\u300c\u78ba\u8a8d\u9a57\u6536\u300d\u5373\u8996\u70ba\u5b8c\u6210",
    ]
    for i, c in enumerate(conditions, 1):
        pdf.body_text(f"{i}. {c}", indent=5)
    pdf.note_text("\u9a57\u6536\u5b8c\u6210\u5f8c\uff0c\u4e59\u65b9\u5c07\u9032\u884c\u6b63\u5f0f\u4e0a\u7dda\u90e8\u7f72\u3002")

    # === Page 4: Sections 7-9 ===
    pdf.add_page()

    # === Payment ===
    pdf.section_title("\u4e03\u3001\u4ed8\u6b3e\u65b9\u5f0f")
    pdf.simple_table(
        ["\u968e\u6bb5", "\u6bd4\u4f8b", "\u6642\u9593\u9ede", "\u91d1\u984d\uff08\u4ee5\u5408\u8cfc\u597d\u53cb\u512a\u60e0\u50f9 NT$6,600 \u70ba\u4f8b\uff09"],
        [
            ["\u8a02\u91d1", "50%", "\u7c3d\u7d04 / \u78ba\u8a8d\u5408\u4f5c\u6642", "NT$ 3,300"],
            ["\u5c3e\u6b3e", "50%", "\u9a57\u6536\u5b8c\u6210\u5f8c", "NT$ 3,300"],
        ],
        [30, 25, 70, 65],
    )
    pdf.bullet("\u4ed8\u6b3e\u65b9\u5f0f\uff1a\u9280\u884c\u8f49\u5e33\uff08\u5e33\u6236\u8cc7\u8a0a\u5c07\u65bc\u78ba\u8a8d\u5408\u4f5c\u5f8c\u63d0\u4f9b\uff09")
    pdf.bullet("\u8a02\u91d1\u652f\u4ed8\u5f8c\u5373\u555f\u52d5\u5c08\u6848")

    # === Timeline ===
    pdf.section_title("\u516b\u3001\u5c08\u6848\u6642\u7a0b")
    pdf.simple_table(
        ["\u968e\u6bb5", "\u6642\u9593", "\u8aaa\u660e"],
        [
            ["\u9700\u6c42\u78ba\u8a8d & \u4ed8\u6b3e", "Day 0", "\u96d9\u65b9\u78ba\u8a8d\u9700\u6c42\u3001\u7532\u65b9\u652f\u4ed8\u8a02\u91d1"],
            ["\u7d20\u6750\u63d0\u4f9b\u622a\u6b62", "Day 0 + 10 \u65e5", "\u7532\u65b9\u63d0\u4f9b\u65b0\u4eba\u7167\u7247\u8207\u6240\u6709\u7d20\u6750"],
            ["\u521d\u7248\u4ea4\u4ed8", "\u4ed8\u6b3e\u65e5\u8d77\u7b97 20 \u500b\u5de5\u4f5c\u5929\u5167", "\u4e59\u65b9\u5b8c\u6210\u521d\u7248\u8a2d\u8a08\u4e26\u63d0\u4f9b\u9810\u89bd"],
            ["\u4fee\u6539\u8207\u5b9a\u7a3f", "\u521d\u7248\u4ea4\u4ed8\u5f8c", "\u4f9d\u4fee\u6539\u6b21\u6578\u9032\u884c\u8abf\u6574"],
            ["\u9a57\u6536 & \u4e0a\u7dda", "\u5b9a\u7a3f\u78ba\u8a8d\u5f8c 3 \u500b\u5de5\u4f5c\u5929\u5167", "\u6b63\u5f0f\u90e8\u7f72\u4e0a\u7dda"],
        ],
        [45, 60, 85],
    )
    pdf.body_text("\u672c\u6848\u9810\u8a08\u6642\u7a0b\uff1a", bold=True)
    pdf.bullet("\u9810\u8a08\u958b\u5de5\u65e5\uff1a2025/5/4")
    pdf.bullet("\u9810\u8a08\u5b8c\u5de5\u65e5\uff1a2025/5/29 \u524d\u4ea4\u4ed8\u521d\u7248")
    pdf.bullet("\u5f8c\u7e8c\u4fee\u6539\uff1a\u6bcf\u8f2a\u4fee\u6539\u4e59\u65b9\u65bc 5 \u500b\u5de5\u4f5c\u5929\u5167\u5b8c\u6210")
    pdf.note_text("\u82e5\u7532\u65b9\u672a\u65bc\u7d04\u5b9a\u6642\u9593\u5167\u63d0\u4f9b\u7d20\u6750\uff0c\u6642\u7a0b\u5c07\u9806\u5ef6\u5c0d\u61c9\u5929\u6578\u3002")

    # === Hosting ===
    pdf.section_title("\u4e5d\u3001\u7db2\u7ad9\u8a17\u7ba1\u8207\u7dad\u8b77")
    pdf.simple_table(
        ["\u9805\u76ee", "\u8aaa\u660e"],
        [
            ["\u514d\u8cbb\u8a17\u7ba1\u671f\u9593", "\u9a57\u6536\u5b8c\u6210\u65e5\u8d77\u7b97\u4e00\u5e74"],
            ["\u8a17\u7ba1\u5e73\u53f0", "Cloudflare \u96f2\u7aef\u8a17\u7ba1\u670d\u52d9"],
            ["\u670d\u52d9\u53ef\u7528\u6027", "\u4f9d\u8a17\u7ba1\u5e73\u53f0\uff08Cloudflare\uff09\u4e4b\u670d\u52d9\u6c34\u6e96\u70ba\u6e96"],
            ["\u9069\u7528\u6d41\u91cf", "\u4e00\u822c\u5a5a\u79ae\u4f7f\u7528\u898f\u6a21\u3002Cloudflare \u5b89\u5168\u9632\u8b77\u6a5f\u5236\u5c07\u81ea\u52d5\u5075\u6e2c\u7570\u5e38\u6d41\u91cf\uff0c\u5982\u6709\u7570\u5e38\u5c07\u5148\u66ab\u6642\u4e0b\u67b6\uff0c\u7531\u4e59\u65b9\u6392\u67e5\u8655\u7406\u5f8c\u91cd\u65b0\u4e0a\u7dda"],
            ["\u7e8c\u7d04\u8a17\u7ba1", "\u514d\u8cbb\u671f\u6eff\u5f8c\u5982\u9700\u7e7c\u7e8c\u8a17\u7ba1\uff0c\u96d9\u65b9\u53e6\u884c\u5354\u8b70\u8cbb\u7528"],
            ["\u8cd3\u5ba2\u540d\u55ae\u66f4\u65b0", "\u514d\u8cbb\u63d0\u4f9b\uff0c\u4e0d\u9650\u6b21\u6578"],
            ["\u5167\u5bb9\u66f4\u65b0", "\u9a57\u6536\u5f8c\u5982\u9700\u66f4\u65b0\u8a2d\u8a08\u5167\u5bb9\uff0c\u8996\u8abf\u6574\u5e45\u5ea6\u53e6\u884c\u5831\u50f9"],
        ],
        [34, 156],
    )
    # === Contract Terms ===
    pdf.add_page()
    pdf.section_title("\u5341\u3001\u5408\u7d04\u689d\u6b3e")

    pdf.body_text("\u7b2c 1 \u689d \u2014 \u5408\u7d04\u751f\u6548", bold=True)
    pdf.body_text("\u672c\u5408\u7d04\u81ea\u7532\u65b9\u652f\u4ed8\u8a02\u91d1\u4e14\u4e59\u65b9\u78ba\u8a8d\u6536\u6b3e\u4e4b\u65e5\u8d77\u751f\u6548\u3002", indent=5)
    pdf.ln(2)

    pdf.body_text("\u7b2c 2 \u689d \u2014 \u96d9\u65b9\u6b0a\u5229\u7fa9\u52d9", bold=True)
    pdf.body_text("\u7532\u65b9\u7fa9\u52d9\uff1a", indent=5)
    pdf.bullet("\u65bc\u7d04\u5b9a\u6642\u9593\u5167\u63d0\u4f9b\u5b8c\u6574\u7d20\u6750\uff08\u7167\u7247\u3001\u6587\u5b57\u3001\u8cd3\u5ba2\u540d\u55ae\u7b49\uff09", 15)
    pdf.bullet("\u65bc\u6536\u5230\u521d\u7248\u5f8c 7 \u500b\u5de5\u4f5c\u5929\u5167\u56de\u8986\u4fee\u6539\u610f\u898b\u6216\u78ba\u8a8d\u9a57\u6536", 15)
    pdf.bullet("\u6309\u6642\u652f\u4ed8\u6b3e\u9805", 15)
    pdf.body_text("\u4e59\u65b9\u7fa9\u52d9\uff1a", indent=5)
    pdf.bullet("\u4f9d\u7d04\u5b9a\u6642\u7a0b\u5b8c\u6210\u8a2d\u8a08\u8207\u958b\u767c\u5de5\u4f5c", 15)
    pdf.bullet("\u63d0\u4f9b\u7d04\u5b9a\u4e4b\u4fee\u6539\u670d\u52d9", 15)
    pdf.bullet("\u59a5\u5584\u4fdd\u7ba1\u7532\u65b9\u63d0\u4f9b\u4e4b\u7d20\u6750\u8207\u8cc7\u6599", 15)
    pdf.ln(2)

    pdf.body_text("\u7b2c 3 \u689d \u2014 \u667a\u6167\u8ca1\u7522\u6b0a", bold=True)
    pdf.bullet("\u7db2\u9801\u7a0b\u5f0f\u78bc\u4e4b\u8457\u4f5c\u6b0a\u6b78\u4e59\u65b9\u6240\u6709", 15)
    pdf.bullet("\u7532\u65b9\u4eab\u6709\u8a72\u7db2\u9801\u65bc\u8a17\u7ba1\u671f\u9593\u5167\u4e4b\u4f7f\u7528\u6b0a", 15)
    pdf.bullet("\u7532\u65b9\u63d0\u4f9b\u4e4b\u7167\u7247\u3001\u6587\u5b57\u7b49\u7d20\u6750\uff0c\u5176\u8457\u4f5c\u6b0a\u4ecd\u6b78\u7532\u65b9\u6240\u6709", 15)
    pdf.bullet("\u4e59\u65b9\u5f97\u5c07\u672c\u6848\u6210\u679c\u4f5c\u70ba\u4f5c\u54c1\u96c6\u5c55\u793a", 15)
    pdf.ln(2)

    pdf.body_text("\u7b2c 4 \u689d \u2014 \u96b1\u79c1\u4fdd\u8b77", bold=True)
    pdf.bullet("\u4e59\u65b9\u5c07\u59a5\u5584\u8655\u7406\u7532\u65b9\u63d0\u4f9b\u4e4b\u8cd3\u5ba2\u8cc7\u6599\uff0c\u50c5\u7528\u65bc\u672c\u5c08\u6848", 15)
    pdf.bullet("\u5c08\u6848\u7d50\u675f\u5f8c\uff0c\u4e59\u65b9\u4e0d\u4e3b\u52d5\u4fdd\u7559\u8cd3\u5ba2\u500b\u4eba\u8cc7\u6599", 15)
    pdf.bullet("\u672a\u7d93\u7532\u65b9\u540c\u610f\uff0c\u4e59\u65b9\u4e0d\u5f97\u5c07\u8cc7\u6599\u63d0\u4f9b\u4e88\u7b2c\u4e09\u65b9", 15)
    pdf.ln(2)

    pdf.body_text("\u7b2c 5 \u689d \u2014 \u5c08\u6848\u8b8a\u66f4", bold=True)
    pdf.bullet("\u5982\u7532\u65b9\u9700\u6c42\u8d85\u51fa\u539f\u5b9a\u7bc4\u570d\uff0c\u4e59\u65b9\u5c07\u63d0\u4f9b\u8ffd\u52a0\u5831\u50f9\uff0c\u7d93\u7532\u65b9\u540c\u610f\u5f8c\u57f7\u884c", 15)
    pdf.bullet("\u9700\u6c42\u8b8a\u66f4\u53ef\u80fd\u5f71\u97ff\u4ea4\u4ed8\u6642\u7a0b\uff0c\u96d9\u65b9\u53e6\u884c\u5354\u8b70\u8abf\u6574", 15)
    pdf.ln(2)

    pdf.body_text("\u7b2c 6 \u689d \u2014 \u53d6\u6d88\u8207\u9000\u6b3e", bold=True)
    pdf.simple_table(
        ["\u60c5\u5883", "\u9000\u6b3e\u65b9\u5f0f"],
        [
            ["\u7532\u65b9\u65bc\u4e59\u65b9\u5c1a\u672a\u958b\u5de5\u524d\u53d6\u6d88", "\u5168\u984d\u9000\u9084\u8a02\u91d1"],
            ["\u7532\u65b9\u65bc\u4e59\u65b9\u5df2\u958b\u5de5\u3001\u521d\u7248\u4ea4\u4ed8\u524d\u53d6\u6d88", "\u9000\u9084\u8a02\u91d1\u4e4b 50%\uff08\u5373\u7e3d\u50f9\u4e4b 25%\uff09"],
            ["\u7532\u65b9\u65bc\u521d\u7248\u4ea4\u4ed8\u5f8c\u53d6\u6d88", "\u8a02\u91d1\u4e0d\u4e88\u9000\u9084"],
            ["\u56e0\u4e59\u65b9\u539f\u56e0\u7121\u6cd5\u5b8c\u6210\u5c08\u6848", "\u5168\u984d\u9000\u9084\u5df2\u6536\u6b3e\u9805"],
        ],
        [95, 95],
    )
    pdf.ln(1)

    pdf.body_text("\u7b2c 7 \u689d \u2014 \u903e\u671f\u8655\u7406", bold=True)
    pdf.bullet(
        "\u82e5\u4e59\u65b9\u672a\u65bc\u7d04\u5b9a\u6642\u7a0b\u5167\u4ea4\u4ed8\u521d\u7248\uff08\u6392\u9664\u56e0\u7532\u65b9\u7d20\u6750\u5ef6\u9072\u4e4b\u5929\u6578\uff09\uff0c"
        "\u7532\u65b9\u5f97\u8981\u6c42\u6bcf\u903e\u671f\u4e00\u500b\u5de5\u4f5c\u5929\u6e1b\u514d\u5c3e\u6b3e 2%\uff0c\u6700\u9ad8\u6e1b\u514d\u81f3\u5c3e\u6b3e\u4e4b 20%",
        15,
    )
    pdf.bullet(
        "\u82e5\u7532\u65b9\u903e\u671f\u8d85\u904e 30 \u65e5\u672a\u63d0\u4f9b\u7d20\u6750\u4e14\u672a\u56de\u8986\u806f\u7e6b\uff0c"
        "\u4e59\u65b9\u5f97\u8996\u70ba\u7532\u65b9\u653e\u68c4\u672c\u6848\uff0c\u8a02\u91d1\u4e0d\u4e88\u9000\u9084",
        15,
    )
    pdf.ln(2)

    pdf.body_text("\u7b2c 8 \u689d \u2014 \u514d\u8cac\u689d\u6b3e", bold=True)
    pdf.bullet(
        "\u56e0\u4e0d\u53ef\u6297\u529b\u56e0\u7d20\uff08\u5929\u707d\u3001\u7db2\u8def\u670d\u52d9\u5546\u4e2d\u65b7\u3001\u8a17\u7ba1\u5e73\u53f0\u6545\u969c\u7b49\uff09\u5c0e\u81f4\u7db2\u7ad9\u7121\u6cd5\u5b58\u53d6\uff0c\u4e59\u65b9\u4e0d\u8ca0\u8ce0\u511f\u8cac\u4efb",
        15,
    )
    pdf.bullet("\u7532\u65b9\u63d0\u4f9b\u4e4b\u7d20\u6750\u82e5\u6d89\u53ca\u7b2c\u4e09\u65b9\u8457\u4f5c\u6b0a\u722d\u8b70\uff0c\u7531\u7532\u65b9\u81ea\u884c\u8ca0\u8cac", 15)
    pdf.ln(2)

    pdf.body_text("\u7b2c 9 \u689d \u2014 \u722d\u8b70\u8655\u7406", bold=True)
    pdf.body_text(
        "\u96d9\u65b9\u5982\u6709\u722d\u8b70\uff0c\u61c9\u5148\u4ee5\u53cb\u5584\u5354\u5546\u65b9\u5f0f\u89e3\u6c7a\u3002\u5354\u5546\u4e0d\u6210\u6642\uff0c\u540c\u610f\u4ee5\u53f0\u7063\u53f0\u5317\u5730\u65b9\u6cd5\u9662\u70ba\u7b2c\u4e00\u5be9\u7ba1\u8f44\u6cd5\u9662\u3002",
        indent=5,
    )
    pdf.ln(2)

    pdf.body_text("\u7b2c 10 \u689d \u2014 \u5176\u4ed6\u7d04\u5b9a", bold=True)
    pdf.bullet("\u672c\u5c08\u6848\u4e0d\u63d0\u4f9b\u5b8c\u6574\u539f\u59cb\u78bc", 15)
    pdf.bullet("\u672c\u5408\u7d04\u672a\u76e1\u4e8b\u5b9c\uff0c\u4f9d\u4e2d\u83ef\u6c11\u570b\u76f8\u95dc\u6cd5\u4ee4\u8fa6\u7406", 15)
    pdf.bullet("\u672c\u5408\u7d04\u4e00\u5f0f\u5169\u4efd\uff0c\u7532\u4e59\u96d9\u65b9\u5404\u57f7\u4e00\u4efd", 15)

    # === Signature ===
    pdf.ln(10)
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(0.6)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.set_line_width(0.2)
    pdf.ln(6)

    pdf.set_font("msjh", "B", 10)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 7, "Ohara Lab \u6b50\u54c8\u62c9\u667a\u9020\u6240", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("msjh", "", 9)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 6, "\u8b93\u6bcf\u4e00\u4efd\u5fc3\u610f\uff0c\u90fd\u6709\u6700\u597d\u7684\u5448\u73fe\u65b9\u5f0f\u3002", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("msjh", "", 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 5, "\u672c\u5efa\u8b70\u66f8\u6709\u6548\u671f\u9650\uff1a\u767c\u51fa\u5f8c 14 \u65e5", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(10)
    y = pdf.get_y()
    pdf.set_font("msjh", "B", 10)
    pdf.set_text_color(*DARK)

    # Left: Party A
    pdf.set_xy(15, y)
    pdf.cell(80, 7, "\u7532\u65b9\u7c3d\u7ae0\uff1a", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(15, y + 20)
    pdf.set_draw_color(*GRAY)
    pdf.line(15, y + 18, 85, y + 18)
    pdf.set_font("msjh", "", 9)
    pdf.cell(80, 6, "\u65e5\u671f\uff1a＿＿＿＿＿＿")

    # Right: Party B
    pdf.set_xy(110, y)
    pdf.set_font("msjh", "B", 10)
    pdf.cell(80, 7, "\u4e59\u65b9\u7c3d\u7ae0\uff08Ohara Lab\uff09\uff1a", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(110, y + 20)
    pdf.line(110, y + 18, 185, y + 18)
    pdf.set_font("msjh", "", 9)
    pdf.cell(80, 6, "\u65e5\u671f\uff1a＿＿＿＿＿＿")

    pdf.output(OUTPUT)
    print(f"PDF saved to: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
