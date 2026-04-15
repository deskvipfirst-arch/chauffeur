import Link from "next/link"
import Image from "next/image"
import { FleetCarousel } from "./fleetCarousel"

// Sample car data - replace with your actual car images
const luxurySedan = [
  {
    name: "Mercedes-Benz S-Class",
    image: "/images/cars/ms1.jpg?height=192&width=384",
    description: "Our luxury sedans offer the perfect blend of comfort and style for business travel or airport transfers."
  },
  {
    name: "BMW 7 Series",
    image: "/images/cars/ms2.jpg?height=192&width=384",
    description: "Elegant design with advanced technology for a premium travel experience."
  },
  {
    name: "Audi A8",
    image: "/images/cars/ms3.jpg?height=192&width=384",
    description: "Sophisticated luxury with exceptional comfort and performance."
  }
]

const executiveSUV = [
  {
    name: "Range Rover Autobiography",
    image: "/images/cars/suv1.jpg?height=192&width=384",
    description: "Our spacious SUVs provide extra comfort and luggage space without compromising on luxury."
  },
  {
    name: "Cadillac Escalade",
    image: "/images/cars/suv2.jpg?height=192&width=384",
    description: "Commanding presence with spacious interior for ultimate comfort."
  },
  {
    name: "Mercedes-Benz GLS",
    image: "/images/cars/suv3.jpg?height=192&width=384",
    description: "Refined luxury SUV with exceptional space and comfort."
  }
]

const luxuryVan = [
  {
    name: "Mercedes-Benz V-Class",
    image: "/images/cars/rr1.jpg?height=192&width=384",
    description: "Perfect for group travel, our luxury vans combine space and comfort for a premium experience."
  },
  {
    name: "Volkswagen Multivan",
    image: "/images/cars/rr2.jpg?height=192&width=384",
    description: "Versatile and comfortable for larger groups with ample luggage space."
  },
  {
    name: "Toyota Alphard",
    image: "/images/cars/rr3.jpg?height=192&width=384",
    description: "Luxurious van with premium features for group transportation."
  }
]


export default function ServicesPage() {


  return (
    <main className="flex flex-col min-h-screen">
      <div className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center">Our Services</h1>
        </div>
      </div>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Premium Chauffeur Services</h2>
            <p className="text-muted-foreground">
              We offer a comprehensive range of luxury chauffeur services tailored to meet your specific requirements.
              Whether you need airport transfers, corporate travel, or special event transportation, our professional
              chauffeurs and luxury fleet are at your service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-64 bg-gray-300">
                <Image
                  src="/images/airport-transfer.jpg"
                  height={256}
                  width={512}
                  className="w-full h-full object-cover"
                  alt="Airport Transfer" />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Airport Transfers</h3>
                <p className="text-muted-foreground mb-4">
                  Start and end your journey in comfort with our reliable airport transfer service. Our chauffeurs
                  monitor flight arrivals in real-time to ensure they are waiting for you, even if your flight is
                  delayed.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Flight monitoring</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Meet & greet service</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Luggage assistance</span>
                  </li>
                </ul>
                <Link href="/#estimate" className="inline-flex items-center text-primary hover:underline">
                  Get a quote
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
                    className="lucide lucide-arrow-right ml-1"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-64 bg-gray-300">
                <Image
                  src="/images/corporate-travel.jpg"
                  width={512}
                  height={256}
                  alt="Corporate Travel"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Corporate Travel</h3>
                <p className="text-muted-foreground mb-4">
                  Make a lasting impression with our corporate chauffeur services. We provide reliable, discreet
                  transportation for executives, clients, and business partners.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Corporate accounts available</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Wi-Fi equipped vehicles</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Confidentiality guaranteed</span>
                  </li>
                </ul>
                <Link href="/#estimate" className="inline-flex items-center text-primary hover:underline">
                  Get a quote
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
                    className="lucide lucide-arrow-right ml-1"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-64 bg-gray-300">
                <Image
                  src="/images/special-events.jpg"
                  width={512}
                  height={256}
                  alt="Special Events"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Special Events</h3>
                <p className="text-muted-foreground mb-4">
                  Make your special day even more memorable with our luxury chauffeur services for weddings,
                  anniversaries, and other important occasions.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Wedding packages</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Red carpet service</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Customized decorations</span>
                  </li>
                </ul>
                <Link href="/#estimate" className="inline-flex items-center text-primary hover:underline">
                  Get a quote
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
                    className="lucide lucide-arrow-right ml-1"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-64 bg-gray-300">
                <video autoPlay muted loop className="inset-0 w-full h-full object-cover">
                  <source src="/videos/city-tour.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">City Tours</h3>
                <p className="text-muted-foreground mb-4">
                  Explore the city in style with our personalized sightseeing tours. Our knowledgeable chauffeurs double
                  as guides to show you the best attractions and hidden gems.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Customized itineraries</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Local knowledge</span>
                  </li>
                  <li className="flex items-start">
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
                      className="lucide lucide-check text-primary mr-2 flex-shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Flexible scheduling</span>
                  </li>
                </ul>
                <Link href="/#estimate" className="inline-flex items-center text-primary hover:underline">
                  Get a quote
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
                    className="lucide lucide-arrow-right ml-1"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Fleet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-300">
                <FleetCarousel
                  cars={luxurySedan}
                  title="Luxury Sedans"
                  capacity="Up to 3 passengers"
                />
              </div>
              <div className="py-16">
                {/* <h3 className="text-xl font-bold mb-2"></h3>
                <p className="text-muted-foreground mb-10">
                </p>
                <p className="text-sm text-muted-foreground">
                </p> */}
              </div>
            </div>
            <div className="bg-background rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-300">
                <FleetCarousel
                  cars={executiveSUV}
                  title="Luxury SUVs"
                  capacity="Up to 3 passengers"
                />
              </div>
              <div className="py-16"></div>
              {/* <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Executive SUVs</h3>
                <p className="text-muted-foreground mb-4">
                Our spacious SUVs provide extra comfort and luggage space without compromising on luxury.
                </p>
                <p className="text-sm text-muted-foreground">
                <strong>Capacity:</strong> Up to 6 passengers
                </p>
                </div> */}
            </div>
            <div className="bg-background rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-300">
                <FleetCarousel
                  cars={luxuryVan}
                  title="Luxury Vans"
                  capacity="Up to 3 passengers"
                />
              </div>
              <div className="py-16"></div>
              {/* <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Luxury Vans</h3>
                <p className="text-muted-foreground mb-4">
                  Perfect for group travel, our luxury vans combine space and comfort for a premium experience.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Capacity:</strong> Up to 8 passengers
                </p>
              </div> */}
            </div>
          </div>
          <div className="text-center mt-8">
            <Link 
              href="/fleet" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              View All Vehicles
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
                className="ml-2 h-5 w-5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to Book Your Journey?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#estimate"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Get a Quote
            </Link>
            <Link
              href="/contact"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

