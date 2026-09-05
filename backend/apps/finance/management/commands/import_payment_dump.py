import re
from decimal import Decimal
from datetime import datetime

from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.finance.models import Payment, PaymentItem, PaymentCategory
from apps.patients.models import Patient
from apps.doctors.models import Doctor


class Command(BaseCommand):
    help = "Import legacy payment records from a phpMyAdmin SQL dump."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            required=True,
            help="Absolute path to the payment SQL dump file.",
        )
        parser.add_argument(
            "--skip-existing",
            action="store_true",
            help="Skip payments that already exist by id (default behavior).",
        )

    def handle(self, *args, **options):
        path = options["path"]
        skip_existing = options["skip_existing"]

        self.stdout.write(f"Reading dump: {path}")
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            content = handle.read()

        insert_blocks = self._extract_insert_blocks(content)
        if not insert_blocks:
            self.stdout.write(self.style.WARNING("No payment INSERT blocks found."))
            return

        created = 0
        skipped = 0
        skipped_existing = 0
        skipped_missing_patient = 0
        skipped_error = 0
        item_created = 0
        item_skipped = 0

        for block in insert_blocks:
            for row_values in self._parse_values_block(block):
                payment_data = self._map_payment_row(row_values)
                if not payment_data:
                    skipped += 1
                    continue

                payment_id = payment_data.pop("id")
                if skip_existing and Payment.objects.filter(id=payment_id).exists():
                    skipped_existing += 1
                    continue

                category_tokens = payment_data.pop("_category_tokens", [])

                try:
                    with transaction.atomic():
                        payment = Payment.objects.create(id=payment_id, **payment_data)
                except IntegrityError:
                    skipped_existing += 1
                    continue
                except Exception:
                    skipped_error += 1
                    continue

                created += 1

                for token in category_tokens:
                    parsed = self._parse_category_token(token)
                    if not parsed:
                        item_skipped += 1
                        continue

                    category_id, rate, quantity = parsed
                    category = PaymentCategory.objects.filter(id=category_id).first()
                    description = category.name if category else f"Category {category_id}"
                    if not category:
                        item_skipped += 1
                        continue

                    PaymentItem.objects.create(
                        payment=payment,
                        payment_category=category,
                        description=description,
                        quantity=quantity,
                        rate=rate,
                        amount=rate * quantity,
                    )
                    item_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Imported payments: {created}, skipped: {skipped}. "
            f"Skipped existing: {skipped_existing}, skipped missing patient: {skipped_missing_patient}, skipped errors: {skipped_error}. "
            f"Items created: {item_created}, items skipped: {item_skipped}."
        ))

    def _extract_insert_blocks(self, content: str) -> list[str]:
        blocks = []
        pattern = re.compile(r"INSERT INTO `payment`.*?;", re.DOTALL | re.IGNORECASE)
        for match in pattern.finditer(content):
            blocks.append(match.group(0))
        return blocks

    def _parse_values_block(self, block: str) -> list[list[str]]:
        values_match = re.search(r"VALUES\s*(.*);", block, re.DOTALL | re.IGNORECASE)
        if not values_match:
            return []

        values_blob = values_match.group(1)
        tuples = re.findall(r"\(([^)]*)\)", values_blob, flags=re.DOTALL)
        rows = []
        for tpl in tuples:
            # Split on commas that are not inside quotes
            parts = []
            current = []
            in_quote = False
            escape = False
            for ch in tpl:
                if escape:
                    current.append(ch)
                    escape = False
                    continue
                if ch == "\\":
                    escape = True
                    current.append(ch)
                    continue
                if ch == "'":
                    in_quote = not in_quote
                    current.append(ch)
                    continue
                if ch == "," and not in_quote:
                    parts.append("".join(current).strip())
                    current = []
                    continue
                current.append(ch)
            if current:
                parts.append("".join(current).strip())
            rows.append(parts)
        return rows

    def _strip_sql_value(self, raw: str) -> str | None:
        if raw is None:
            return None
        value = raw.strip()
        if value.upper() == "NULL":
            return None
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        return value

    def _map_payment_row(self, values: list[str]) -> dict | None:
        if len(values) < 24:
            return None

        def to_decimal(value: str) -> Decimal:
            try:
                return Decimal(str(value))
            except Exception:
                return Decimal("0")

        def to_int(value: str) -> int | None:
            try:
                return int(value)
            except Exception:
                return None

        raw = [self._strip_sql_value(item) for item in values]
        (
            raw_id,
            raw_billing_number,
            raw_date,
            raw_section,
            raw_patient,
            raw_doctor,
            raw_category_name,
            raw_subtotal,
            raw_discount,
            raw_hospital_amount,
            raw_doctor_amount,
            raw_amount_received,
            raw_request_type,
            raw_commission,
            raw_deposit_type,
            raw_package_status,
            raw_status,
            raw_last_edit,
            raw_collected_time,
            raw_received_time,
            raw_remarks,
            raw_clinical_history,
            raw_user,
            raw_processing_status,
        ) = raw[:24]

        payment_id = to_int(raw_id)
        if payment_id is None:
            return None

        patient_id = to_int(raw_patient)
        patient = Patient.objects.filter(id=patient_id).first() if patient_id else None
        if not patient:
            return None

        doctor_id = to_int(raw_doctor)
        doctor = Doctor.objects.filter(id=doctor_id).first() if doctor_id else None

        billing_number = str(raw_billing_number or "").strip()
        invoice_id = billing_number if billing_number not in {"", "0"} else f"LCDB.{payment_id:09d}"
        if Payment.objects.filter(invoice_id=invoice_id).exists():
            invoice_id = f"{invoice_id}-{payment_id}"

        gross_total = to_decimal(raw_subtotal or 0)
        discount = to_decimal(raw_discount or 0)
        amount = max(gross_total - discount, Decimal("0"))
        paid_amount = to_decimal(raw_amount_received or 0)
        balance = amount - paid_amount

        status = (raw_status or "").strip().lower()
        if status in {"paid", "pending", "cancelled", "refunded"}:
            mapped_status = status
        elif status in {"unpaid", "due"}:
            mapped_status = "pending"
        else:
            mapped_status = "pending"

        payment_method = (raw_deposit_type or "").strip().lower()
        if payment_method not in {"cash", "card", "bank", "cheque", "online"}:
            payment_method = "cash"

        collected_time = self._parse_date(raw_collected_time)
        received_time = self._parse_date(raw_received_time)
        payment_datetime = self._parse_date(raw_date)
        updated_datetime = self._parse_date(raw_last_edit)

        category_tokens = []
        if raw_category_name:
            category_tokens = [token.strip() for token in raw_category_name.split(",") if token.strip()]

        return {
            "id": payment_id,
            "invoice_id": invoice_id,
            "patient": patient,
            "doctor": doctor,
            "gross_total": gross_total,
            "discount": discount,
            "discount_percentage": Decimal("0"),
            "tax": Decimal("0"),
            "amount": amount,
            "paid_amount": paid_amount,
            "balance": balance,
            "payment_method": payment_method,
            "status": mapped_status,
            "remarks": raw_remarks or "",
            "reference_number": invoice_id,
            "section": raw_section or "",
            "clinical_history": raw_clinical_history or "",
            "collected_time_string": collected_time,
            "received_time_string": received_time,
            "processing_status": to_int(raw_processing_status or 0) or 0,
            "payment_date": payment_datetime,
            "created_at": payment_datetime,
            "updated_at": updated_datetime or payment_datetime,
            "_category_tokens": category_tokens,
        }

    def _parse_category_token(self, token: str) -> tuple[int, Decimal, int] | None:
        parts = [part.strip() for part in token.split("*") if part.strip()]
        if not parts:
            return None

        try:
            category_id = int(parts[0])
        except Exception:
            return None

        rate = Decimal("0")
        quantity = 1
        if len(parts) > 1:
            try:
                rate = Decimal(str(parts[1]))
            except Exception:
                rate = Decimal("0")
        if len(parts) > 3:
            try:
                quantity = int(parts[3])
            except Exception:
                quantity = 1

        return category_id, rate, quantity

    def _parse_date(self, raw_value: str | None) -> datetime | None:
        if not raw_value:
            return None

        value = raw_value.strip()
        if not value:
            return None

        if value.isdigit():
            try:
                return datetime.fromtimestamp(int(value), tz=timezone.get_current_timezone())
            except Exception:
                pass

        for fmt in ["%Y-%m-%d %H:%M:%S", "%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d"]:
            try:
                candidate = datetime.strptime(value, fmt)
                return self._ensure_tz(candidate)
            except Exception:
                continue

        try:
            return self._ensure_tz(datetime.fromisoformat(value))
        except Exception:
            return None

    def _ensure_tz(self, dt: datetime | None) -> datetime | None:
        if not dt:
            return None
        if timezone.is_aware(dt):
            return dt
        try:
            return timezone.make_aware(dt, timezone.get_current_timezone())
        except Exception:
            return None
