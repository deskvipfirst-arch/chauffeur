"use client";
import {
  Mail,
  Menu,
  Phone,
  X,
  ChevronDown,
  LayoutDashboard,
  User,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { Button } from "./button";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/supabase";
import { onAuthStateChanged, signOut } from "@/lib/supabase-auth";
import { doc, getDoc } from "@/lib/supabase-db";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getUserFirstName } from "@/lib/userDisplay";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileHireByHourOpen, setMobileHireByHourOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [hireByHourOpen, setHireByHourOpen] = useState(false);
  const servicesButtonRef = useRef<HTMLButtonElement>(null);
  const hireByHourButtonRef = useRef<HTMLButtonElement>(null);
  let servicesMenuCloseTimer: NodeJS.Timeout;
  let hireByHourMenuCloseTimer: NodeJS.Timeout;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "profiles", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          setUserProfile({
            firstName: getUserFirstName(null, user),
            email: user.email || "",
          });
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/user/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const greetingName = getUserFirstName(userProfile, user);

  return (
    <header className="border-b relative z-[100]">
      {/* Top Bar */}
      <div className="bg-muted py-2">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex text-sm">
                <Phone className="h-4 w-4 mr-2" />
                <span>+44 (0) 7467677766</span>
              </div>
              <div className="flex text-sm">
                <Mail className="h-4 w-4 mr-2" />
                <span>info@yourchauffeurbusiness.com</span>
              </div>
            </div>
            <div className="hidden md:block">
              <Link
                href="/#estimate"
                className="text-sm font-medium hover:underline"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/favicon.ico"
                alt="Logo"
                width={40}
                height={40}
                className="mr-2"
              />
              <span className="text-2xl font-bold">
                <span className="text-[#1D3557]">London</span>
                <span className="text-[#DAA520]">Chauffeur</span>
                <span className="text-[#1D3557]">Hire</span>
              </span>
            </Link>
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              About
            </Link>
            <div
              className="relative group"
              onMouseEnter={() => { clearTimeout(servicesMenuCloseTimer); setServicesOpen(true); }}
              onMouseLeave={() => {
                servicesMenuCloseTimer = setTimeout(() => { setServicesOpen(false); }, 120);
              }}
            >
              <button
                ref={servicesButtonRef}
                className={clsx(
                  "text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 focus:outline-none",
                  servicesOpen && "text-primary"
                )}
                aria-haspopup="menu"
                aria-expanded={servicesOpen}
                aria-controls="services-menu"
                onClick={e => { e.preventDefault(); setServicesOpen(v => !v); }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") { setServicesOpen(v => !v); }
                  if (e.key === "Escape") { setServicesOpen(false); servicesButtonRef.current?.focus(); }
                }}
                tabIndex={0}
              >
                Services <ChevronDown className={clsx("h-4 w-4 transition-transform duration-200", servicesOpen && "rotate-180")}/>
              </button>
              <div
                id="services-menu"
                role="menu"
                aria-label="Services"
                className={clsx(
                  "absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 origin-top opacity-0 scale-95 pointer-events-none",
                  servicesOpen && "opacity-100 scale-100 pointer-events-auto"
                )}
                style={{ transitionProperty: 'opacity, transform' }}
                onMouseEnter={() => { clearTimeout(servicesMenuCloseTimer); setServicesOpen(true); }}
                onMouseLeave={() => {
                  servicesMenuCloseTimer = setTimeout(() => { setServicesOpen(false); }, 120);
                }}
              >
                <div className="py-1">
                  <Link
                    href="/services#meet-and-greet"
                    role="menuitem"
                    tabIndex={servicesOpen ? 0 : -1}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
                    onClick={() => { setServicesOpen(false); }}
                  >
                    Meet & Greet
                  </Link>
                  <Link
                    href="/services#airport-transfer"
                    role="menuitem"
                    tabIndex={servicesOpen ? 0 : -1}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
                    onClick={() => { setServicesOpen(false); }}
                  >
                    Airport Transfer
                  </Link>
                  <div
                    className="relative group/submenu"
                    onMouseEnter={() => { clearTimeout(hireByHourMenuCloseTimer); setHireByHourOpen(true); }}
                    onMouseLeave={() => {
                      hireByHourMenuCloseTimer = setTimeout(() => { setHireByHourOpen(false); }, 120);
                    }}
                  >
                    <button
                      ref={hireByHourButtonRef}
                      className={clsx(
                        "flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 transition-colors focus:outline-none",
                        hireByHourOpen && "bg-gray-100"
                      )}
                      aria-haspopup="menu"
                      aria-expanded={hireByHourOpen}
                      aria-controls="hirebyhour-menu"
                      tabIndex={servicesOpen ? 0 : -1}
                      onClick={e => { e.preventDefault(); setHireByHourOpen(v => !v); }}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") { setHireByHourOpen(v => !v); }
                        if (e.key === "Escape") { setHireByHourOpen(false); hireByHourButtonRef.current?.focus(); }
                      }}
                    >
                      Hire By Hour <ChevronDown className={clsx("h-4 w-4 ml-auto transition-transform duration-200", hireByHourOpen && "rotate-90")}/>
                    </button>
                    <div
                      id="hirebyhour-menu"
                      role="menu"
                      aria-label="Hire By Hour"
                      className={clsx(
                        "absolute top-0 right-full -mr-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 origin-top-right opacity-0 scale-95 pointer-events-none",
                        hireByHourOpen && "opacity-100 scale-100 pointer-events-auto"
                      )}
                      style={{ right: '100%', left: 'auto', transitionProperty: 'opacity, transform' }}
                      onMouseEnter={() => { clearTimeout(hireByHourMenuCloseTimer); setHireByHourOpen(true); }}
                      onMouseLeave={() => {
                        hireByHourMenuCloseTimer = setTimeout(() => { setHireByHourOpen(false); }, 120);
                      }}
                    >
                      <div className="py-1">
                        <Link
                          href="/services#serving-cities"
                          role="menuitem"
                          tabIndex={hireByHourOpen ? 0 : -1}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
                          onClick={() => { setHireByHourOpen(false); setServicesOpen(false); }}
                        >
                          Serving Cities
                        </Link>
                        <Link
                          href="/fleet"
                          role="menuitem"
                          tabIndex={hireByHourOpen ? 0 : -1}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
                          onClick={() => { setHireByHourOpen(false); setServicesOpen(false); }}
                        >
                          Our Fleet
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Link
              href="/contact"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Contact
            </Link>
            {!isLoading && (
              <>
                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 hover:bg-accent"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span>Hello, {greetingName}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              router.push("/user/dashboard");
                              setIsDropdownOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => {
                              router.push("/user/profile");
                              setIsDropdownOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </button>
                          <div className="border-t border-gray-100"></div>
                          <button
                            onClick={() => {
                              handleSignOut();
                              setIsDropdownOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button asChild>
                    <Link href="/user/signin">Sign in</Link>
                  </Button>
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Toggle Menu"
              onClick={toggleMenu}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Slide-in) */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } z-50`}
      >
        {/* Close Button */}
        <button
          onClick={toggleMenu}
          className="absolute top-4 right-4 text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Mobile Nav Links */}
        <nav className="flex flex-col mt-16 space-y-6 px-6">
          <Link
            href="/"
            onClick={toggleMenu}
            className="text-sm font-medium hover:text-primary"
          >
            Home
          </Link>
          <Link
            href="/about"
            onClick={toggleMenu}
            className="text-sm font-medium hover:text-primary"
          >
            About
          </Link>
          <button
            className="flex items-center justify-between text-sm font-medium hover:text-primary focus:outline-none w-full bg-transparent border-0 p-0"
            onClick={() => setMobileServicesOpen((v) => !v)}
            aria-expanded={mobileServicesOpen}
            aria-controls="mobile-services-menu"
            type="button"
          >
            <span>Services</span>
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileServicesOpen && (
            <div id="mobile-services-menu" className="ml-4 flex flex-col space-y-2">
              <Link
                href="/services#meet-and-greet"
                onClick={() => { toggleMenu(); setMobileServicesOpen(false); }}
                className="text-sm font-medium hover:text-primary"
              >
                Meet & Greet
              </Link>
              <Link
                href="/services#airport-transfer"
                onClick={() => { toggleMenu(); setMobileServicesOpen(false); }}
                className="text-sm font-medium hover:text-primary"
              >
                Airport Transfer
              </Link>
              <button
                className="flex items-center justify-between text-sm font-medium hover:text-primary focus:outline-none w-full bg-transparent border-0 p-0"
                onClick={() => setMobileHireByHourOpen((v) => !v)}
                aria-expanded={mobileHireByHourOpen}
                aria-controls="mobile-hirebyhour-menu"
                type="button"
              >
                <span>Hire By Hour</span>
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${mobileHireByHourOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileHireByHourOpen && (
                <div id="mobile-hirebyhour-menu" className="ml-4 flex flex-col space-y-2">
                  <Link
                    href="/services#serving-cities"
                    onClick={() => { toggleMenu(); setMobileServicesOpen(false); setMobileHireByHourOpen(false); }}
                    className="text-sm font-medium hover:text-primary"
                  >
                    Serving Cities
                  </Link>
                  <Link
                    href="/fleet"
                    onClick={() => { toggleMenu(); setMobileServicesOpen(false); setMobileHireByHourOpen(false); }}
                    className="text-sm font-medium hover:text-primary"
                  >
                    Our Fleet
                  </Link>
                </div>
              )}
            </div>
          )}
          <Link
            href="/contact"
            onClick={toggleMenu}
            className="text-sm font-medium hover:text-primary"
          >
            Contact
          </Link>
          {!isLoading && (
            <>
              {user ? (
                <>
                  <div className="text-sm font-medium">
                    Hello, {greetingName}
                  </div>
                  <Link
                    href="/user/dashboard"
                    onClick={toggleMenu}
                    className="text-sm font-medium hover:text-primary"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/user/profile"
                    onClick={toggleMenu}
                    className="text-sm font-medium hover:text-primary"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      toggleMenu();
                    }}
                    className="text-sm font-medium hover:text-primary text-left text-red-600"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/user/signin"
                  onClick={toggleMenu}
                  className="text-sm font-medium hover:text-primary"
                >
                  Sign in
                </Link>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Overlay (click outside to close menu) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleMenu}
        ></div>
      )}
    </header>
  );
}
