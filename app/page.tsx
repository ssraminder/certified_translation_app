import { QuoteRequestForm } from "@/components/quote-request-form"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">Certified Translation Quote</h1>
            <p className="text-lg text-muted leading-relaxed text-pretty">
              Upload your documents to receive an instant quote for professional certified translation services
            </p>
          </div>
          <QuoteRequestForm />
        </div>
      </div>
    </main>
  )
}
