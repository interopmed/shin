from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = (
        "One-time sync: set lab.status=2 when lab_test_value exists for the same "
        "lab_order_id and matches category or subcategory."
    )

    def handle(self, *args, **options):
        self.stdout.write("Running fast SQL update...")
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE lab AS l
                SET status = '2'
                WHERE l.status <> '2'
                  AND EXISTS (
                    SELECT 1
                    FROM lab_test_value AS v
                    WHERE v.lab_order_id = l.lab_order_id
                      AND (
                        (v.category IS NOT NULL AND l.category = v.category)
                        OR (v.subcategory IS NOT NULL AND l.category = v.subcategory)
                        OR EXISTS (
                          SELECT 1
                          FROM lab_subcategory AS s
                          WHERE s.category_id::text = l.category
                            AND lower(s.name) = lower(v.subcategory)
                        )
                      )
                  )
                """
            )
            updated = cursor.rowcount

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} lab rows."))
