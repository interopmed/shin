from __future__ import annotations

import re
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.finance.models import PaymentCategory


class Command(BaseCommand):
    help = "Import payment_category rows from a MySQL SQL dump with INSERT statements."

    def add_arguments(self, parser):
        parser.add_argument(
            "sql_path",
            type=str,
            help="Path to payment_category.sql containing INSERT INTO payment_category statements.",
        )

    def handle(self, *args, **options):
        sql_path = Path(options["sql_path"]).expanduser()
        if not sql_path.exists():
            raise CommandError(f"File not found: {sql_path}")

        content = sql_path.read_text(encoding="utf-8", errors="ignore")
        insert_blocks = self._extract_insert_blocks(content)
        if not insert_blocks:
            raise CommandError("No INSERT INTO `payment_category` blocks found in SQL file.")

        rows = []
        for block in insert_blocks:
            rows.extend(self._parse_values_block(block))

        if not rows:
            raise CommandError("No rows parsed from INSERT statements.")

        self.stdout.write(f"Parsed {len(rows)} rows. Importing...")
        imported = 0
        with transaction.atomic():
            for row in rows:
                data = self._row_to_fields(row)
                PaymentCategory.objects.update_or_create(id=data.pop("id"), defaults=data)
                imported += 1

        self.stdout.write(self.style.SUCCESS(f"Imported {imported} payment categories."))

    def _extract_insert_blocks(self, content: str) -> list[str]:
        pattern = re.compile(
            r"INSERT\s+INTO\s+`?payment_category`?\s*\([^)]*\)\s*VALUES\s*(.*?);",
            re.IGNORECASE | re.DOTALL,
        )
        return [match.group(1) for match in pattern.finditer(content)]

    def _parse_values_block(self, block: str) -> list[list[str]]:
        rows = []
        current = []
        token = ""
        in_quotes = False
        escape = False
        depth = 0

        for ch in block:
            if escape:
                token += ch
                escape = False
                continue

            if ch == "\\":
                escape = True
                token += ch
                continue

            if ch == "'":
                in_quotes = not in_quotes
                token += ch
                continue

            if ch == "(" and not in_quotes:
                depth += 1
                if depth == 1:
                    current = []
                    token = ""
                    continue

            if ch == ")" and not in_quotes:
                depth -= 1
                if depth == 0:
                    current.append(token.strip())
                    rows.append(current)
                    token = ""
                    current = []
                    continue

            if ch == "," and not in_quotes and depth == 1:
                current.append(token.strip())
                token = ""
                continue

            if depth >= 1:
                token += ch

        return rows

    def _clean_value(self, value: str) -> str:
        cleaned = value.strip()
        if cleaned.upper() == "NULL":
            return ""
        if cleaned.startswith("'") and cleaned.endswith("'"):
            return cleaned[1:-1]
        return cleaned

    def _row_to_fields(self, row: list[str]) -> dict:
        if len(row) != 11:
            raise CommandError(f"Unexpected row length {len(row)} for row: {row}")

        values = [self._clean_value(value) for value in row]
        (
            row_id,
            category,
            lab_id,
            description,
            section,
            package,
            c_price,
            service_type,
            d_commission,
            h_commission,
            processing_method,
        ) = values

        return {
            "id": int(row_id),
            "name": category,
            "price": Decimal(c_price or "0"),
            "description": description,
            "category_type": (section or "lab").strip().lower(),
            "lab_id": int(lab_id or 0),
            "section": section,
            "package": int(package or 0),
            "service_type": service_type,
            "d_commission": int(d_commission or 0),
            "h_commission": int(h_commission or 0),
            "processing_method": processing_method,
            "is_active": True,
        }
