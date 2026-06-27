import InstalledModulePage from "../page";

type ModuleSubPageProps = {
  params: Promise<{
    moduleId: string;
    modulePath: string[];
  }>;
};

export default async function InstalledModuleSubPage({ params }: ModuleSubPageProps) {
  const { moduleId } = await params;

  return <InstalledModulePage params={Promise.resolve({ moduleId })} />;
}
