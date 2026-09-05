from __future__ import annotations

import re
from pathlib import Path

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.settings.models import Menu, MenuSub


class Command(BaseCommand):
    help = "Import menu and menu_sub rows from MySQL SQL dumps with INSERT statements."

    def add_arguments(self, parser):
        parser.add_argument(
            "menu_sql",
            type=str,
            help="Path to menu.sql containing INSERT INTO menu statements.",
        )
        parser.add_argument(
            "menu_sub_sql",
            type=str,
            help="Path to menu_sub.sql containing INSERT INTO menu_sub statements.",
        )

    def handle(self, *args, **options):
        menu_sql = Path(options["menu_sql"]).expanduser()
        menu_sub_sql = Path(options["menu_sub_sql"]).expanduser()

        if not menu_sql.exists():
            raise CommandError(f"File not found: {menu_sql}")
        if not menu_sub_sql.exists():
            raise CommandError(f"File not found: {menu_sub_sql}")

        menu_rows = self._parse_table(menu_sql.read_text(encoding="utf-8", errors="ignore"), "menu")
        menu_sub_rows = self._parse_table(
            menu_sub_sql.read_text(encoding="utf-8", errors="ignore"),
            "menu_sub",
        )

        if not menu_rows:
            raise CommandError("No INSERT INTO `menu` rows found in SQL file.")
        if not menu_sub_rows:
            raise CommandError("No INSERT INTO `menu_sub` rows found in SQL file.")

        self.stdout.write(
            f"Parsed {len(menu_rows)} menu rows and {len(menu_sub_rows)} menu_sub rows. Importing..."
        )

        with transaction.atomic():
            self._import_menus(menu_rows)
            self._import_menu_subs(menu_sub_rows)

        self.stdout.write(self.style.SUCCESS("Menu import completed."))

    def _parse_table(self, content: str, table_name: str) -> list[list[str]]:
        blocks = self._extract_insert_blocks(content, table_name)
        rows: list[list[str]] = []
        for block in blocks:
            rows.extend(self._parse_values_block(block))
        return rows

    def _extract_insert_blocks(self, content: str, table_name: str) -> list[str]:
        pattern = re.compile(
            rf"INSERT\s+INTO\s+`?{re.escape(table_name)}`?\s*\([^)]*\)\s*VALUES\s*(.*?);",
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

    def _parse_roles(self, users_raw: str) -> list[str]:
        roles = []
        for role in users_raw.split(","):
            name = role.strip()
            if name:
                roles.append(name)
        return roles

    def _set_groups(self, instance, users_raw: str) -> None:
        group_names = self._parse_roles(users_raw)
        groups = [Group.objects.get_or_create(name=name)[0] for name in group_names]
        instance.groups.set(groups)

    def _import_menus(self, rows: list[list[str]]) -> None:
        for row in rows:
            if len(row) != 4:
                raise CommandError(f"Unexpected menu row length {len(row)} for row: {row}")

            values = [self._clean_value(value) for value in row]
            row_id, name, users_raw, icon = values

            menu, _ = Menu.objects.update_or_create(
                id=int(row_id),
                defaults={
                    "name": name,
                    "icon": icon,
                },
            )
            self._set_groups(menu, users_raw)

    def _import_menu_subs(self, rows: list[list[str]]) -> None:
        for row in rows:
            if len(row) != 7:
                raise CommandError(f"Unexpected menu_sub row length {len(row)} for row: {row}")

            values = [self._clean_value(value) for value in row]
            row_id, name, menu_name, value, link, users_raw, color = values

            menu, _ = Menu.objects.get_or_create(name=menu_name, defaults={"icon": ""})
            menu_sub, _ = MenuSub.objects.update_or_create(
                id=int(row_id),
                defaults={
                    "name": name,
                    "menu": menu,
                    "value": value,
                    "link": link,
                    "color": color,
                },
            )
            self._set_groups(menu_sub, users_raw)
