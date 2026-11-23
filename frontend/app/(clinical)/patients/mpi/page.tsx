import { getPatientMpi } from "@/lib/patients-db";
import MpiClient from "@/components/MpiClient";

export const dynamic = "force-dynamic";

export default async function MasterPatientIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; sex?: string; confidence?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const query = resolvedSearchParams.query || "";
  const sex = resolvedSearchParams.sex || "";
  const confidenceFilter = resolvedSearchParams.confidence || "";
  const pageSize = 10;

  const mpi = await getPatientMpi(page, pageSize, query, sex, confidenceFilter);
  const loadedCount = mpi.patients.length;
  const totalCount = mpi.pagination?.total ?? loadedCount;
  const totalPages = mpi.pagination?.totalPages ?? 1;

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  const getPaginationRange = (current: number, total: number) => {
    const range: (number | string)[] = [];
    if (total <= 8) {
      for (let i = 1; i <= total; i++) {
        range.push(i);
      }
      return range;
    }

    if (current <= 4) {
      range.push(1, 2, 3, 4, "...", total - 2, total - 1, total);
    } else if (current >= total - 3) {
      range.push(1, 2, 3, "...", total - 3, total - 2, total - 1, total);
    } else {
      range.push(1, "...", current - 1, current, current + 1, "...", total);
    }
    return range;
  };

  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <MpiClient
      mpi={mpi}
      page={page}
      query={query}
      sex={sex}
      confidenceFilter={confidenceFilter}
      pageSize={pageSize}
      loadedCount={loadedCount}
      totalCount={totalCount}
      totalPages={totalPages}
      startRecord={startRecord}
      endRecord={endRecord}
      paginationRange={paginationRange}
    />
  );
}
