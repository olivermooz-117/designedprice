import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">
            DesignedPrice
          </h1>
          <p className="text-lg text-zinc-500 max-w-md mx-auto">
            Upload a photo of vintage, streetwear or designer clothing and get
            instant identification + market valuation.
          </p>
        </div>

        <UploadForm />
      </div>
    </main>
  );
}
