import Image from "next/image"
import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center">About Us</h1>
        </div>
      </div>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Our service has been providing premium transportation solutions to discerning
                clients for over a decade. What started as a small fleet of luxury vehicles has grown into one of the
                most respected chauffeur companies in the region.
              </p>
              <p className="text-muted-foreground mb-4">
                Our commitment to excellence, punctuality, and customer satisfaction has earned us a loyal clientele of
                business executives, celebrities, and travelers who value comfort, reliability, and discretion.
              </p>
              <p className="text-muted-foreground">
                Today, we continue to uphold the highest standards in the industry, combining traditional values of
                service with modern technology to deliver an unparalleled chauffeur experience.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/images/about.jpg"
                height={128}
                width={128}
                alt="Our Company"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Mission & Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-target"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Our Mission</h3>
              <p className="text-muted-foreground">
                To provide exceptional chauffeur services that exceed client expectations through reliability,
                professionalism, and attention to detail.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-eye"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Our Vision</h3>
              <p className="text-muted-foreground">
                To be the leading meet and greet service known for setting the industry standard in luxury transportation and
                customer care.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-heart"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Our Values</h3>
              <p className="text-muted-foreground">
                Excellence, integrity, discretion, and personalized service form the foundation of everything we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="rounded-full overflow-hidden w-32 h-32 mx-auto mb-4">
                <Image
                  src="/images/user-avatar.png"
                  height={128}
                  width={128}
                  alt="Team Member"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold mb-1">John Smith</h3>
              <p className="text-primary mb-2">Founder & CEO</p>
              <p className="text-muted-foreground text-sm">
                With over 20 years in the luxury transportation industry, John leads our company with passion and
                expertise.
              </p>
            </div>
            <div className="text-center">
              <div className="rounded-full overflow-hidden w-32 h-32 mx-auto mb-4">
                <Image
                  src="/images/user-avatar.png"
                  height={128}
                  width={128}
                  alt="Team Member"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold mb-1">Sarah Johnson</h3>
              <p className="text-primary mb-2">Operations Manager</p>
              <p className="text-muted-foreground text-sm">
                Sarah ensures that every journey is meticulously planned and executed to perfection.
              </p>
            </div>
            <div className="text-center">
              <div className="rounded-full overflow-hidden w-32 h-32 mx-auto mb-4">
                <Image
                  src="/images/user-avatar.png"
                  height={128}
                  width={128}
                  alt="Team Member"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold mb-1">Michael Chen</h3>
              <p className="text-primary mb-2">Fleet Manager</p>
              <p className="text-muted-foreground text-sm">
                Michael oversees our luxury fleet, ensuring all vehicles meet our exacting standards.
              </p>
            </div>
            <div className="text-center">
              <div className="rounded-full overflow-hidden w-32 h-32 mx-auto mb-4">
                <Image
                  src="/images/user-avatar.png"
                  height={128}
                  width={128}
                  alt="Team Member"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold mb-1">Emma Davis</h3>
              <p className="text-primary mb-2">Customer Relations</p>
              <p className="text-muted-foreground text-sm">
                Emma is dedicated to ensuring our clients receive personalized service that exceeds expectations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to Experience Our Service?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/services"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Our Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

