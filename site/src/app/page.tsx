import { Facts, Fit } from "@/components/landing/facts-and-fit";
import { Grading } from "@/components/landing/grading";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Probe, Review } from "@/components/landing/probe-and-review";
import { Proof } from "@/components/landing/proof";
import { ReleaseMatrix } from "@/components/landing/release-matrix";
import { VerifyExample } from "@/components/landing/verify-example";
import { SITE } from "@/lib/site";

// Structured data, so search engines read mcpkeel as a free developer tool.
const SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "mcpkeel",
  description: SITE.description,
  url: SITE.url,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, macOS, Windows",
  softwareVersion: SITE.version,
  license: "https://opensource.org/licenses/MIT",
  codeRepository: SITE.repo,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Home() {
  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE).replace(/</g, "\\u003c") }} />
      <Hero />
      <Proof />
      <VerifyExample />
      <ReleaseMatrix />
      <HowItWorks />
      <Grading />
      <Probe />
      <Review />
      <Facts />
      <Fit />
    </main>
  );
}
