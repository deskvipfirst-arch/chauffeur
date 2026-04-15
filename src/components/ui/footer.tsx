import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-muted py-12 border-t">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <Link href="/" className="text-2xl font-bold">
                            LuxuryRide
                        </Link>
                        <p className="mt-4 text-muted-foreground">
                            Providing premium chauffeur services with unparalleled comfort, reliability, and professionalism.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                                    Our Services
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold mb-4">Services</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                                    Airport Transfers
                                </Link>
                            </li>
                            <li>
                                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                                    Corporate Travel
                                </Link>
                            </li>
                            <li>
                                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                                    Special Events
                                </Link>
                            </li>
                            <li>
                                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                                    City Tours
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold mb-4">Contact</h3>
                        <address className="not-italic text-muted-foreground">
                            <p>123 Luxury Drive</p>
                            <p>Suite 456</p>
                            <p>London, TW13 6AR</p>
                            <p className="mt-2">Phone: +44 (0) 746-767-7766</p>
                            <p>Email: info@yourchauffeurbusiness.com</p>
                        </address>
                    </div>
                </div>
                <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} LuxuryRide. All rights reserved.
                    </p>
                    <div className="flex space-x-4 mt-4 md:mt-0">
                        <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Terms & Conditions
                        </Link>
                        <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}