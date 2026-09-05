export default async function NewPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div className="p-6 w-full max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Write New Prescription</h1>
          <p className="text-muted-foreground mt-2">
            Search for a medication and write a new prescription for patient {resolvedParams.id}.
          </p>
        </div>
      </div>
      
      {/* Placeholder for the prescription form */}
      <div className="border rounded-lg p-8 space-y-6 bg-card text-card-foreground shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Medication Search
            </label>
            <input 
              type="text" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2" 
              placeholder="Search for medication (e.g. Amoxicillin)" 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="text-sm font-medium leading-none">Dose</label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" placeholder="e.g. 500mg" />
            </div>
            <div>
              <label className="text-sm font-medium leading-none">Frequency</label>
              <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" placeholder="e.g. BID" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
           <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
             Send to Pharmacy
           </button>
        </div>
      </div>
    </div>
  );
}
