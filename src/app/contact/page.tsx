"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => ({ message: "Unable to send message right now." }));

      if (!response.ok) {
        throw new Error(result.message || "Failed to send the email");
      }

      setSuccess(result.message || "Your message has been sent successfully!");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error sending message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen">
      {/* Contact Info Section */}
      <div className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center">Contact Us</h1>
        </div>
      </div>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column with Contact Info */}
            <div>
              <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">
                We&apos;re here to answer any questions you may have about our chauffeur services. Reach out to us and we&apos;ll
                respond as soon as we can.
              </p>

              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Phone</h3>
                    <p className="text-muted-foreground">+44 (0) 746-767-7766</p>
                    <p className="text-muted-foreground">Available 24/7</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Email</h3>
                    <p className="text-muted-foreground">info@yourchauffeurbusiness.com</p>
                    <p className="text-muted-foreground">bookings@yourchauffeurbusiness.com</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Office Address</h3>
                    <p className="text-muted-foreground">123 Luxury Drive</p>
                    <p className="text-muted-foreground">Suite 456</p>
                    <p className="text-muted-foreground">London, TW13 6AR</p>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Business Hours</h3>
                    <p className="text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p className="text-muted-foreground">Saturday: 10:00 AM - 4:00 PM</p>
                    <p className="text-muted-foreground">Sunday: Closed (Bookings available 24/7)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column with Contact Form */}
            <div className="bg-muted p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>

              {/* Form */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="first-name" className="text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      id="first-name"
                      name="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="last-name" className="text-sm font-medium">
                      Last Name
                    </label>
                    <Input
                      id="last-name"
                      name="lastName"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.smith@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Booking Inquiry"
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Please provide details about your inquiry..."
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </div>

              {/* Display Success or Error */}
              {success && <p className="text-green-600 mt-4">{success}</p>}
              {error && <p className="text-red-600 mt-4">{error}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Location</h2>
          <div className="rounded-lg overflow-hidden shadow-lg h-[400px] bg-gray-300">
            {/* Map Embed */}
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <p className="text-muted-foreground">Map will be displayed here</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}