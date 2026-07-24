import { SurveyForm } from "./survey-form";

export default function DemoSurveyPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-commo-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SurveyForm />
      </div>
    </main>
  );
}
