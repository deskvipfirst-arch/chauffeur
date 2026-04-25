"use client"
import Link from "next/link"
import Image from "next/image"
import { PriceEstimator } from "@/components/price-estimator/PriceEstimator"
import { Suspense } from "react"
import { APP_TITLE, APP_SUBTITLE } from "@/lib/globalConfig"


export default function Home() {
  // const [activeTab, setActiveTab] = useState("one-way");
  return (
    <main className="flex flex-col min-h-screen">
      <div className="relative h-[70vh] w-full">
        <video autoPlay muted loop className="absolute inset-0 w-full h-full object-cover">
          <source src="/videos/luxury-car.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Left Side - Text and Button */}
            <div className="flex flex-col justify-center text-white">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{APP_TITLE}</h1>
              <p className="text-xl md:text-2xl mb-8 max-w-xl">
                {APP_SUBTITLE}
              </p>
              <Link
                href="#estimate"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors w-fit"
              >
                Get a Quote
              </Link>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center">
              {/* <form className="bg-white/90 p-6 rounded-lg shadow-lg w-full max-w-md">
                <div className="flex mb-4">
                  <Button
                    type="button"
                    className={`px-8 py-2 font-semibold ${activeTab === "one-way" ? "bg-primary text-white" : "bg-gray-200 text-primary"}`}
                    onClick={() => setActiveTab("one-way")}
                  >
                    One Way
                  </Button>
                  <Button
                    type="button"
                    className={`px-8 py-2 font-semibold ${activeTab === "by-hour" ? "bg-primary text-white" : "bg-gray-200 text-primary"}`}
                    onClick={() => setActiveTab("by-hour")}
                  >
                    By the Hour
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-800">Journey Start</Label>
                    <Input
                      type="text"
                      placeholder="Pickup Location"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {activeTab === "one-way" ? (
                    <div>
                      <Label className="text-gray-800">Destination</Label>
                      <Input
                        type="text"
                        placeholder="Drop-off Location"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label className="text-gray-800">Duration</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          placeholder="Number"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <select
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-800">Journey Date</Label>
                    <Input
                      type="datetime-local"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Request Quote
                  </button>
                </div>
              </form> */}
            </div>
          </div>
        </div>
      </div>

      <section id="estimate" className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={<div>Loading estimator...</div>}>
              <PriceEstimator/>
            </Suspense>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Premium Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-300">
                <Image
                  src="/images/airport-transfer.jpg"
                  alt="Airport Transfer"
                  height={256}
                  width={512}
                  priority={true}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Airport Transfers</h3>
                <p className="text-muted-foreground">Reliable and punctual airport pickup and drop-off services.</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-300">
                <Image
                  src="/images/corporate-travel.jpg"
                  height={256}
                  width={512}
                  alt="Corporate Travel"
                  className="w-full h-full object-cover"

                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Corporate Travel</h3>
                <p className="text-muted-foreground">Professional chauffeur services for business executives.</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-300">
                <Image
                  src="/images/special-events.jpg"
                  height={256}
                  width={512}
                  alt="Special Events"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Special Events</h3>
                <p className="text-muted-foreground">Luxury transportation for weddings and special occasions.</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link
              href="/services"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium transition-colors"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
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
                  className="lucide lucide-clock"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Punctuality</h3>
              <p className="text-muted-foreground">Always on time, every time.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
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
                  className="lucide lucide-shield-check"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Safety</h3>
              <p className="text-muted-foreground">Professional drivers with impeccable safety records.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
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
                  className="lucide lucide-car"
                >
                  <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
                  <circle cx="6.5" cy="16.5" r="2.5" />
                  <circle cx="16.5" cy="16.5" r="2.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Luxury Fleet</h3>
              <p className="text-muted-foreground">Premium vehicles maintained to the highest standards.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-300 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
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
                  className="lucide lucide-headphones"
                >
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
              <p className="text-muted-foreground">Round-the-clock customer service for your convenience.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to Experience Premium Transportation?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="#estimate"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Get a Quote
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}