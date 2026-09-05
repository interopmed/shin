export default async function PatientPrescriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div className="p-6 w-full h-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Prescriptions</h1>
          <p className="text-muted-foreground mt-2">
            Active and historical medications for patient {resolvedParams.id}.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <a
            href={`/patients/${resolvedParams.id}/prescriptions/new`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Write Prescription
          </a>
        </div>
      </div>
      
      {/* Placeholder for the patient's prescriptions list */}
      <div className="border rounded-lg p-8 flex items-center justify-center text-muted-foreground bg-slate-50/50">
        Patient Medication History - Coming Soon
      </div>
    </div>
  );
}
